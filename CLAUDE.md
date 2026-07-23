# mktCl — 요기보 B2B 이메일 마케팅 어드민 (사용 설명)

빈백 브랜드 **요기보(Yogibo)**의 B2B 콜드 이메일 마케팅 파이프라인.
키워드 크롤링 → AI 1차 검증 → 관리자 검토·승인 → 카테고리별 메일 발송.

## 파이프라인 한눈에
```
키워드(카테고리별) × 전국 시·도
  → 네이버 발굴 → Playwright 홈페이지 이메일 추출
  → [1차 DB: leads]  AI 1차 검증(규모·적합성·유효성)
  → 관리자 검토/승인
  → [2차 DB: recipients]  카테고리 양식 렌더 → SMTP 발송(정보통신망법 준수)
```

## 타깃 5개 카테고리 (`src/lib/categories.js`)
| key | 라벨 | 요기보 소구점 |
|---|---|---|
| public | 학교·공공기관·복지시설 | 도서관·라운지·상담실·복지 라운지 |
| company | 기업 | 오피스 휴게실·리프레시존 |
| medical | 병·의원 | 대기실·소아 진료실·요양 라운지 |
| resort | 리조트·호텔 | 로비·키즈존·풀사이드·객실 |
| sports | 스포츠시설·단체 | 선수 라운지·회복공간·관람 라운지 |

**타깃 원칙: 규모 있는 곳만.** 대량 납품 가치가 있는 곳(체인 호텔·대학병원·대기업·프로구단·규모 있는 복지관 등)이 valid. 개인 펜션·소형 업소는 AI가 부적합 처리.

## 상태값 (한글 라벨: `src/lib/labels.js`)
- **AI 검증(aiStatus)**: `검증 대기(pending)` · `적합(valid)` · `부적합(invalid)` + 점수(0~100)
- **관리자 검토(status)**: `검토 대기(pending)` · `승인(approved)` · `반려(rejected)`
- **발송(sendStatus)**: `발송 대기(ready)` · `발송 완료(sent)` · `실패(failed)` · `수신거부(unsubscribed)`

## 화면 (http://localhost:5600)
- **개요(/)** — 파이프라인 단계별·카테고리별 집계
- **크롤링(/crawl)** — 키워드 관리 + 단건 크롤 실행
- **1차 검토(/review)** — 카테고리별 진행현황(검토대기/승인/반려/AI미검증) + AI 검증 실행 + 선택 승인/반려
- **발송 리스트(/send)** — 건별 선택 발송 / 발송리스트 취소(→1차 검토 되돌리기) / 대기 전체 발송 + 날짜별 발송 이력
- **메일 양식(/templates)** — 카테고리별 제목·본문 미리보기 내 직접 편집(WYSIWYG)

## 실행 방법
```bash
npm run dev            # 개발 서버 (http://localhost:5600)

# 전국 대량 크롤 (네이버 발굴 → Playwright 이메일 추출 → leads 적재)
npm run crawl:all              # 전체 카테고리
npm run crawl:all public       # 특정 카테고리만

npm run validate:all   # pending 리드 전체 AI 검증 (dev 서버 실행 중이어야 함)
node scripts/exportLeads.js    # 전체 leads → data/leads_export.csv (엑셀)
```

### 크롤 키워드 늘리기
`scripts/crawlAll.js`의 `KEYWORDS`(카테고리별 배열)에 키워드를 추가하면 다음 크롤부터 반영. 지역은 `REGIONS`(전국 17개 시·도). 이미 수집된 이메일은 자동 중복 제거되므로 새 키워드를 넣어야 신규가 쌓임.

## 필요 환경변수 (`.env.local`)
```
MONGODB_URI=              # MongoDB 연결 문자열
NAVER_CLIENT_ID=          # 네이버 검색 API (developers.naver.com)
NAVER_CLIENT_SECRET=
ANTHROPIC_API_KEY=        # AI 검증용 (기본 모델 claude-opus-4-8)
SMTP_HOST= SMTP_USER= SMTP_PASS=   # 회사 메일 발송 (테스트 후 설정)
MAIL_FROM_ADDRESS= COMPANY_NAME= COMPANY_ADDR= COMPANY_TEL=  # 법규 푸터
UNSUB_SECRET=             # 수신거부 링크 서명
```

## 법규 준수 (정보통신망법 제50조) — 발송 단계 내장
- 제목 `(광고)` 자동 표기
- 본문 하단 발신자 정보 + 수신거부 링크(HMAC 서명) 자동 삽입
- 야간(21:00~08:00 KST) 발송 자동 차단 (긴급 시 "야간차단 무시" 옵션)

## 기술 스택
Next.js 16(App Router) · React 19 · MongoDB · Playwright(헤드리스 크롤링) · nodemailer · @anthropic-ai/sdk

## MongoDB 컬렉션
`leads`(1차) · `recipients`(2차 발송) · `templates` · `campaigns`(발송이력) · `unsubscribes` · `keywords`
