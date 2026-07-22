import { getDashboardStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const s = await getDashboardStats();

  return (
    <div>
      <h1 className="page-title">개요</h1>
      <p className="page-sub">키워드 크롤링 → AI 1차 검증 → 관리자 승인 → 카테고리별 메일 발송</p>

      {!s.connected ? (
        <div className="card" style={{ borderColor: 'var(--warn)' }}>
          <strong>MongoDB에 연결되지 않았습니다.</strong>
          <p className="page-sub" style={{ margin: '8px 0 0' }}>
            <code>.env.local</code>에 <code>MONGODB_URI</code>를 설정하세요. ({s.error})
          </p>
        </div>
      ) : (
        <>
          <div className="cards">
            <Kpi label="전체 크롤링 리스트 (1차 DB)" value={s.total} />
            <Kpi label="검토 대기" value={s.pendingReview} />
            <Kpi label="AI 적합 판정" value={s.aiValid} />
            <Kpi label="관리자 승인" value={s.approved} />
            <Kpi label="발송 리스트 (2차 DB)" value={s.recTotal} />
            <Kpi label="발송 완료" value={s.sent} />
          </div>

          <h2 style={{ marginTop: 32, fontSize: 15 }}>카테고리별 수집 현황</h2>
          <div className="cards" style={{ marginTop: 12 }}>
            {s.byCat.map((c) => (
              <Kpi key={c.key} label={c.label} value={c.count} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card">
      <div className="kpi">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
