'use client';

const WD = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 발송 이력 달력 (월 단위). 발송이 있는 날은 표시, 클릭 시 선택.
 * props: year, month(0-based), days[{date,total,sent}], selected(YYYY-MM-DD),
 *        todayStr, onSelect(dateStr), onMonth(delta)
 */
export default function SendCalendar({ year, month, days, selected, todayStr, onSelect, onMonth }) {
  const startDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const map = {};
  (days || []).forEach((d) => { map[d.date] = d; });

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ d, ds, info: map[ds] });
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button className="btn secondary" style={{ padding: '5px 12px' }} onClick={() => onMonth(-1)}>‹</button>
        <strong>{year}년 {month + 1}월</strong>
        <button className="btn secondary" style={{ padding: '5px 12px' }} onClick={() => onMonth(1)}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {WD.map((w, i) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: i === 0 ? 'var(--bad)' : i === 6 ? 'var(--accent)' : 'var(--muted)', padding: '4px 0' }}>{w}</div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const isSel = c.ds === selected;
          const isToday = c.ds === todayStr;
          const has = !!c.info;
          return (
            <button
              key={i}
              onClick={() => onSelect(c.ds)}
              style={{
                aspectRatio: '1 / 1', borderRadius: 8, cursor: 'pointer',
                border: isToday ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: isSel ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : has ? 'var(--panel-2)' : 'transparent',
                color: isSel ? '#fff' : 'var(--text)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 500 }}>{c.d}</span>
              {has && (
                <span style={{ fontSize: 10, color: isSel ? '#fff' : 'var(--good)' }}>●{c.info.sent}</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 8 }}>● 숫자 = 그날 발송 건수 · 파란 테두리 = 오늘</div>
    </div>
  );
}
