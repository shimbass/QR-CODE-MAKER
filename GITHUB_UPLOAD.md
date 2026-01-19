# GitHub 업로드 가이드

## 1. GitHub 저장소 생성

1. GitHub에 로그인 후 https://github.com/new 접속
2. Repository name 입력 (예: `qr-code-maker`)
3. Public 또는 Private 선택
4. "Create repository" 클릭
5. **중요**: README, .gitignore, license는 추가하지 마세요 (이미 있으므로)

## 2. 프로젝트를 Git으로 관리

터미널에서 다음 명령어를 순서대로 실행하세요:

```bash
# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: QR 코드 제작기"

# GitHub 저장소 연결 (YOUR_USERNAME을 실제 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/qr-code-maker.git

# main 브랜치로 이름 변경 (필요시)
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## 3. 완료!

이제 GitHub에서 프로젝트를 확인할 수 있습니다!
