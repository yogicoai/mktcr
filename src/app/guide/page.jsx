'use client';
import { useEffect, useState } from 'react';

export default function GuidePage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then((r) => { if (r.ok) setStats(r.stats); });
  }, []);

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 className="page-title">이용 가이드</h1>
      <p className="page-sub">요기보 B2B 이메일 마케팅 어드민 사용법과 현재 이용 현황입니다.</p>

      {/* 현재 이용 현황 */}
      <h2 style={{ fontSize: 15 }}>📊 현재 이용 현황</h2>
      {!stats || stats.connected === false ? (
        <div className="card" style={{ marginTop: 8, color: 'var(--muted)' }}>데이터를 불러오는 중…</div>
      ) : (
        <>
          <div className="cards" style={{ marginTop: 8 }}>
            <Kpi label="전체 수집 (1차 DB)" v={stats.total} />
            <Kpi label="검토 대기" v={stats.pendingReview} />
            <Kpi label="AI 적합 판정" v={stats.aiValid} />
            <Kpi label="관리자 승인" v={stats.approved} />
            <Kpi label="발송 리스트" v={stats.recTotal} />
            <Kpi label="발송 완료" v={stats.sent} />
          </div>
          <div className="cards" style={{ marginTop: 12 }}>
            {(stats.byCat || []).map((c) => <Kpi key={c.key} label={c.label} v={c.count} />)}
          </div>
        </>
      )}

      {/* 파이프라인 */}
      <h2 style={{ fontSize: 15, marginTop: 32 }}>🔄 전체 흐름</h2>
      <div className="card" style={{ marginTop: 8 }}>
        <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--muted)', fontSize: 13, margin: 0, lineHeight: 1.7 }}>{`키워드(카테고리별) × 전국 시·도
  → 네이버 발굴 → 홈페이지 이메일 추출
  → [1차 DB] AI 1차 검증(규모·적합성)
  → 관리자 검토·승인
  → [2차 DB] 발송 리스트 → 카테고리 양식 발송`}</pre>
      </div>

      {/* 단계별 사용법 */}
      <h2 style={{ fontSize: 15, marginTop: 32 }}>📝 단계별 사용법</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        <Step n="1" title="크롤링 (데이터 수집)">
          <b>크롤링</b> 탭에서 카테고리·키워드를 관리하고 수집합니다. 대량 수집은 관리자가 전국 자동 크롤을 실행합니다.
          수집된 업체·이메일은 <b>1차 DB(검증 대기)</b>로 들어갑니다.
        </Step>
        <Step n="2" title="1차 검토 (AI + 관리자)">
          <b>1차 검토</b> 탭에서 상단 카드로 <b>검토 대기·승인·반려</b> 현황을 확인합니다.
          「AI 1차 검증 실행」을 누르면 AI가 <b>규모·적합성</b>으로 <span style={{ color: 'var(--good)' }}>적합</span>/<span style={{ color: 'var(--bad)' }}>부적합</span>을 점수와 함께 판정합니다.
          적합 리드를 체크해 <b>선택 승인 → 발송리스트</b>로 넘깁니다.
        </Step>
        <Step n="3" title="메일 양식 확인">
          <b>메일 양식</b> 탭에서 카테고리별 제목·본문을 미리보기 안에서 바로 편집합니다.
          발송 시 제목 <b>(광고)</b>와 하단 <b>수신거부·회사정보</b>가 자동으로 붙습니다.
        </Step>
        <Step n="4" title="발송 설정">
          <b>발송 설정</b> 탭에서 메일 서버(SMTP)·발신자·회사 정보를 입력합니다. 아이디·비밀번호는 저장 후 화면에 표시되지 않습니다.
        </Step>
        <Step n="5" title="테스트 & 발송">
          <b>발송 리스트</b> 탭 상단의 <b>🧪 테스트 메일</b>로 내 주소에 먼저 보내 확인합니다.
          이후 건별 선택해 <b>발송</b>하거나, 마음이 바뀌면 <b>발송리스트 취소(→1차 검토)</b>로 되돌릴 수 있습니다.
          날짜별 발송 이력도 하단에서 확인됩니다.
        </Step>
      </div>

      {/* 새 크롤링 제안 */}
      <h2 style={{ fontSize: 15, marginTop: 32 }}>🔎 새 크롤링을 원할 때 (관리자에게 제안하기)</h2>
      <div className="card" style={{ marginTop: 8, color: 'var(--muted)', lineHeight: 1.8 }}>
        대량 수집(전국 크롤)은 <b style={{ color: 'var(--text)' }}>관리자가 실행</b>합니다. 새 타깃을 넓히고 싶으면 아래 항목을 정리해 관리자에게 요청하세요:
        <ol style={{ margin: '10px 0 0', paddingLeft: 20 }}>
          <li><b style={{ color: 'var(--text)' }}>카테고리</b> — 학교·공공·복지 / 기업 / 병·의원 / 리조트·호텔 / 스포츠 중 무엇</li>
          <li><b style={{ color: 'var(--text)' }}>키워드(예시)</b> — 예: “대학병원”, “골프리조트”, “IT기업”, “문화센터” 등 (구체적일수록 좋음)</li>
          <li><b style={{ color: 'var(--text)' }}>지역</b> — 전국 / 특정 시·도(예: 서울·경기·부산)</li>
          <li><b style={{ color: 'var(--text)' }}>타깃 규모</b> — 요기보는 <b style={{ color: 'var(--text)' }}>대량 납품 가치가 있는 규모 있는 곳</b>이 적합 (소규모는 AI가 걸러냄)</li>
          <li><b style={{ color: 'var(--text)' }}>목표 건수</b> — 대략 몇 건 정도 필요한지</li>
        </ol>
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--panel-2)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
          제안 예시: <i>“리조트·호텔 카테고리에 ‘골프리조트, 워터파크’ 키워드로 전국 크롤 부탁드려요. 규모 있는 곳 위주로 200건 정도 목표입니다.”</i>
        </div>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          관리자는 <code>scripts/crawlAll.js</code>의 키워드에 반영 후 <code>npm run crawl:all</code>로 실행합니다. 이미 수집된 이메일은 자동 중복 제거되어, <b style={{ color: 'var(--text)' }}>새 키워드를 넣어야 신규가 쌓입니다.</b>
        </div>
      </div>

      {/* 상태값 */}
      <h2 style={{ fontSize: 15, marginTop: 32 }}>🏷️ 상태값 뜻</h2>
      <div className="card" style={{ marginTop: 8 }}>
        <table>
          <thead><tr><th>구분</th><th>상태</th><th>의미</th></tr></thead>
          <tbody>
            <Row a="AI 검증" b="검증 대기 / 적합 / 부적합" c="AI가 요기보 B2B 적합성을 판단 (점수 0~100)" />
            <Row a="관리자 검토" b="검토 대기 / 승인 / 반려" c="사람이 최종 확인. 승인 시 발송 리스트로 이동" />
            <Row a="발송" b="발송 대기 / 발송 완료 / 실패 / 수신거부" c="실제 메일 발송 상태" />
          </tbody>
        </table>
      </div>

      {/* 법규 */}
      <h2 style={{ fontSize: 15, marginTop: 32 }}>⚖️ 법규 준수</h2>
      <div className="card" style={{ marginTop: 8, color: 'var(--muted)', lineHeight: 1.7 }}>
        정보통신망법 제50조에 따라 발송 시 자동 적용: 제목 <b style={{ color: 'var(--text)' }}>(광고)</b> 표기 ·
        본문 하단 <b style={{ color: 'var(--text)' }}>발신자 정보 + 수신거부 링크</b> · <b style={{ color: 'var(--text)' }}>야간(21~08시) 발송 차단</b>.
        <div style={{ marginTop: 8, color: 'var(--warn)' }}>
          ※ 제목의 <b>(광고)</b> 표기는 영리목적 광고성 메일의 <b>법적 의무</b>입니다. <b style={{ color: 'var(--text)' }}>발송 설정</b>에서 끌 수 있으나,
          끄면 <b style={{ color: 'var(--bad)' }}>법 위반(과태료) 소지</b>가 있으므로 회사 책임하에 신중히 결정하세요.
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, v }) {
  return <div className="card"><div className="kpi">{v ?? 0}</div><div className="kpi-label">{label}</div></div>;
}
function Step({ n, title, children }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 14 }}>
      <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}
function Row({ a, b, c }) {
  return <tr><td style={{ fontWeight: 600 }}>{a}</td><td>{b}</td><td style={{ color: 'var(--muted)' }}>{c}</td></tr>;
}
