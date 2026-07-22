# mktCl — 요기보 B2B 이메일 마케팅 어드민

키워드 크롤링 → **AI 1차 검증** → **관리자 2차 승인** → **카테고리별 메일 발송**까지의 파이프라인을 관리하는 내부 어드민.

## 타깃 5개 카테고리
학교·공공기관·복지시설 / 기업 / 병·의원 / 리조트·호텔 / 스포츠시설·단체

## 데이터 흐름
```
키워드(카테고리별) → 네이버 발굴 → 홈페이지 크롤링(이메일 추출)
  → [1차 DB: leads]  AI 1차 검증(적합성·유효성·중복)
  → 관리자 검토/승인
  → [2차 DB: recipients]  카테고리 양식 렌더 → SMTP 발송(정보통신망법 준수)
```

## 스택
Next.js 16 (App Router) · React 19 · MongoDB · nodemailer · cheerio · Claude(@anthropic-ai/sdk)

## 실행
```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev                  # http://localhost:5600
```

## 컬렉션
- `leads` — 1차 크롤링 리스트 (AI 검증 상태 포함)
- `recipients` — 발송 리스트 (승인된 타깃)
- `templates` — 카테고리별 메일 양식
- `campaigns` — 발송 캠페인 이력
- `unsubscribes` — 수신거부
- `keywords` — 카테고리별 크롤링 키워드

## 법규 준수
영리목적 광고성 정보 전송(정보통신망법 제50조): 제목 `(광고)` 표기, 본문 발신자 정보·수신거부 방법, 야간(21~08시) 발송 차단을 발송 단계에 내장.
