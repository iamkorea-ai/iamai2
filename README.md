# IAM AI — 배포 가이드

## 준비물
- GitHub 계정 (무료)
- Vercel 계정 (무료, GitHub으로 가입)
- Anthropic API 키 (console.anthropic.com)

---

## 1단계: GitHub에 코드 올리기

1. https://github.com 접속 → New repository
2. Repository 이름: `iam-ai` → Create repository
3. 이 폴더 전체를 업로드 (Upload files 클릭)

---

## 2단계: Vercel에 배포하기

1. https://vercel.com 접속 → GitHub으로 로그인
2. "Add New Project" → GitHub에서 `iam-ai` 선택
3. "Deploy" 클릭 (설정 그대로 두면 됨)

---

## 3단계: API 키 설정 (핵심!)

배포 후 Vercel 대시보드에서:
1. 프로젝트 클릭 → Settings → Environment Variables
2. 추가:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-...` (실제 키 입력)
3. Save 클릭
4. Deployments → 가장 최근 배포 → Redeploy

---

## 4단계: 완료!

Vercel이 `https://iam-ai-xxx.vercel.app` 같은 URL을 줍니다.
이 URL로 접속하면 앱이 바로 작동해요.

---

## 로컬에서 테스트하려면

```bash
# .env.local 파일 만들기
cp .env.local.example .env.local
# .env.local 파일 열어서 API 키 입력

# 패키지 설치 & 실행
npm install
npm run dev
# http://localhost:3000 접속
```
