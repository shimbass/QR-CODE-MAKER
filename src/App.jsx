import { useState } from 'react'
import QRCode from 'qrcode'
import JSZip from 'jszip'

function App() {
  const [links, setLinks] = useState([{ url: '', image: null, imagePreview: null }])
  const [isGenerating, setIsGenerating] = useState(false)
  const [dragActiveIndex, setDragActiveIndex] = useState(null)
  const [previewQRCodes, setPreviewQRCodes] = useState([])
  const [showPreview, setShowPreview] = useState(false)

  // 링크 추가 (최대 10개)
  const handleAddLink = () => {
    if (links.length < 10) {
      setLinks([...links, { url: '', image: null, imagePreview: null }])
    }
  }

  // 링크 입력 변경
  const handleLinkChange = (index, value) => {
    const newLinks = [...links]
    newLinks[index].url = value
    setLinks(newLinks)
  }

  // 파일을 이미지로 처리하는 공통 함수
  const processImageFile = (index, file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newLinks = [...links]
        newLinks[index].image = file
        newLinks[index].imagePreview = e.target.result
        setLinks(newLinks)
      }
      reader.readAsDataURL(file)
    }
  }

  // 이미지 업로드
  const handleImageUpload = (index, event) => {
    const file = event.target.files[0]
    if (file) {
      processImageFile(index, file)
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActiveIndex(index)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActiveIndex(null)
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActiveIndex(null)

    const file = e.dataTransfer.files[0]
    if (file) {
      processImageFile(index, file)
    }
  }

  // 이미지 제거
  const handleRemoveImage = (index) => {
    const newLinks = [...links]
    newLinks[index].image = null
    newLinks[index].imagePreview = null
    setLinks(newLinks)
  }

  // 링크 항목 제거
  const handleRemoveLink = (index) => {
    if (links.length > 1) {
      const newLinks = links.filter((_, i) => i !== index)
      setLinks(newLinks)
    }
  }

  // QR 코드 생성 (이미지 오버레이 포함)
  const generateQRWithImage = async (url, imageData) => {
    // QR 코드 생성 (더 큰 사이즈로)
    const qrCanvas = await QRCode.toCanvas(url, {
      width: 800,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // 최종 캔버스 생성
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = 800
    finalCanvas.height = 800
    const ctx = finalCanvas.getContext('2d')

    // QR 코드 그리기
    ctx.drawImage(qrCanvas, 0, 0)

    // 이미지가 있는 경우 중앙에 배치
    if (imageData) {
      const img = new Image()
      return new Promise((resolve) => {
        img.onload = () => {
          // 이미지 크기 계산 (QR 코드 중앙 영역의 20% 정도)
          const centerSize = finalCanvas.width * 0.2
          const x = (finalCanvas.width - centerSize) / 2
          const y = (finalCanvas.height - centerSize) / 2

          // 흰색 배경 사각형 그리기 (이미지보다 약간 크게)
          const padding = centerSize * 0.1
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(
            x - padding,
            y - padding,
            centerSize + padding * 2,
            centerSize + padding * 2
          )

          // 이미지 그리기 (비율 유지)
          const aspectRatio = img.width / img.height
          let drawWidth = centerSize
          let drawHeight = centerSize

          if (aspectRatio > 1) {
            drawHeight = centerSize / aspectRatio
          } else {
            drawWidth = centerSize * aspectRatio
          }

          const drawX = x + (centerSize - drawWidth) / 2
          const drawY = y + (centerSize - drawHeight) / 2

          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

          resolve(finalCanvas.toDataURL('image/png'))
        }
        img.src = imageData
      })
    } else {
      return finalCanvas.toDataURL('image/png')
    }
  }

  // 모든 QR 코드 생성 및 저장
  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const validLinks = links.filter(link => link.url.trim() !== '')
      
      if (validLinks.length === 0) {
        alert('최소 하나의 링크를 입력해주세요.')
        setIsGenerating(false)
        return
      }

      const zip = new JSZip()
      const qrData = []
      
      const qrPromises = validLinks.map(async (link, index) => {
        const qrDataUrl = await generateQRWithImage(link.url, link.imagePreview)
        
        // Data URL을 Blob으로 변환
        const response = await fetch(qrDataUrl)
        const blob = await response.blob()
        
        // 파일명 생성 (URL에서 도메인 추출 또는 기본값)
        let fileName = `qrcode_${index + 1}`
        try {
          const urlObj = new URL(link.url)
          const domain = urlObj.hostname.replace('www.', '')
          fileName = `qrcode_${domain}_${index + 1}`
        } catch (e) {
          // 유효하지 않은 URL이면 기본 이름 사용
        }
        
        zip.file(`${fileName}.png`, blob)
        
        // 미리보기용 데이터 저장
        qrData.push({
          url: link.url,
          imageUrl: qrDataUrl,
          fileName: `${fileName}.png`
        })
      })

      await Promise.all(qrPromises)

      // 미리보기 데이터 설정
      setPreviewQRCodes(qrData)
      setShowPreview(true)

      // ZIP 파일 다운로드
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'qr-codes.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('QR 코드 생성 오류:', error)
      alert('QR 코드 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-2">
          QR 코드 제작기
        </h1>
        <p className="text-gray-600 text-center mb-8">
          링크와 이미지를 입력하여 커스텀 QR 코드를 생성하세요
        </p>

        <div className="space-y-4 mb-6">
          {links.map((link, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      링크 {index + 1}
                    </label>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      중앙 이미지 {link.image && '(업로드됨)'}
                    </label>
                    <div className="flex items-center gap-4">
                      {link.imagePreview ? (
                        <div className="relative">
                          <img
                            src={link.imagePreview}
                            alt="Preview"
                            className="w-32 h-32 object-contain border border-gray-300 rounded"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <div
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                              dragActiveIndex === index
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-blue-500'
                            }`}
                          >
                            <svg
                              className="w-8 h-8 text-gray-400 mb-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <span className="text-gray-400 text-xs text-center px-2">
                              {dragActiveIndex === index ? '여기에 드롭' : '클릭 또는 드래그'}
                            </span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(index, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                      <p className="text-xs text-gray-500">
                        중앙에 배치될 이미지를 선택하거나 드래그하세요
                      </p>
                    </div>
                  </div>
                </div>

                {links.length > 1 && (
                  <button
                    onClick={() => handleRemoveLink(index)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="제거"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          {links.length < 10 && (
            <button
              onClick={handleAddLink}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              추가
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                생성 중...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                생성
              </>
            )}
          </button>
        </div>

        {links.length >= 10 && (
          <p className="text-center text-gray-500 mt-4 text-sm">
            최대 10개까지 추가할 수 있습니다
          </p>
        )}
      </div>

      {/* 미리보기 모달 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-auto max-w-[800px] max-h-[90vh] overflow-y-auto mx-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                생성 완료! ({previewQRCodes.length}개)
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8 print-content">
              <p className="text-gray-600 mb-6 text-center">
                모든 QR 코드가 ZIP 파일로 다운로드되었습니다.
              </p>
              
              <div className="flex flex-wrap justify-center gap-6">
                {previewQRCodes.map((qr, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 w-full max-w-[350px]">
                    <div className="text-sm font-medium text-gray-700 mb-2 text-center">
                      {qr.fileName}
                    </div>
                    <div className="bg-white p-4 rounded-lg flex items-center justify-center mb-2">
                      <img
                        src={qr.imageUrl}
                        alt={`QR Code ${index + 1}`}
                        className="max-w-full h-auto"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 truncate text-center" title={qr.url}>
                      {qr.url}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => {
                    const printContent = document.querySelector('.print-content')?.innerHTML
                    if (printContent) {
                      const printWindow = window.open('', '_blank')
                      if (printWindow) {
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>QR 코드 출력</title>
                              <style>
                                body { 
                                  font-family: Arial, sans-serif; 
                                  padding: 20px;
                                  margin: 0;
                                }
                                .qr-container {
                                  display: flex;
                                  flex-wrap: wrap;
                                  justify-content: center;
                                  gap: 24px;
                                }
                                .qr-item {
                                  border: 1px solid #ddd;
                                  border-radius: 8px;
                                  padding: 16px;
                                  background: #f9fafb;
                                  max-width: 350px;
                                  page-break-inside: avoid;
                                }
                                .qr-filename {
                                  font-size: 14px;
                                  font-weight: 600;
                                  color: #374151;
                                  margin-bottom: 8px;
                                  text-align: center;
                                }
                                .qr-image-container {
                                  background: white;
                                  padding: 16px;
                                  border-radius: 8px;
                                  margin-bottom: 8px;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                }
                                .qr-image {
                                  max-width: 100%;
                                  height: auto;
                                  max-height: 300px;
                                }
                                .qr-url {
                                  font-size: 12px;
                                  color: #6b7280;
                                  text-align: center;
                                  word-break: break-all;
                                }
                                @media print {
                                  body { margin: 0; padding: 10px; }
                                  .qr-container { gap: 16px; }
                                }
                              </style>
                            </head>
                            <body>
                              <h1 style="text-align: center; margin-bottom: 20px;">QR 코드 목록 (${previewQRCodes.length}개)</h1>
                              <div class="qr-container">
                                ${previewQRCodes.map((qr, idx) => `
                                  <div class="qr-item">
                                    <div class="qr-filename">${qr.fileName}</div>
                                    <div class="qr-image-container">
                                      <img src="${qr.imageUrl}" alt="QR Code ${idx + 1}" class="qr-image" />
                                    </div>
                                    <div class="qr-url">${qr.url}</div>
                                  </div>
                                `).join('')}
                              </div>
                            </body>
                          </html>
                        `)
                        printWindow.document.close()
                        printWindow.focus()
                        setTimeout(() => {
                          printWindow.print()
                        }, 250)
                      }
                    }
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  출력
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
