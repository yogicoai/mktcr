'use client';
import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { sendLabel } from '@/lib/labels';

const KST_TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export default function SendPage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [testEmail, setTestEmail] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [useAd, setUseAd] = useState(true);
  const [memoSaved, setMemoSaved] = useState('');
  const [rangeStart, setRangeStart] = useState(KST_TODAY);
  const [rangeEnd, setRangeEnd] = useState(KST_TODAY);

  const load = useCallback(async () => {
    const [r, h] = await Promise.all([
      fetch(`/api/recipients?category=${cat}&scheduled=false&limit=200`).then((r) => r.json()),
      fetch(`/api/campaigns?category=${cat}`).then((r) => r.json()),
    ]);
    if (r.ok) {
      setItems(r.items);
      setCounts(r.counts);
      setSel(new Set());
    } else setErr(r.error);
    if (h.ok) setHistory(h.days);
  }, [cat]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((r) => { if (r.ok) setUseAd(r.settings.useAdPrefix !== false); });
  }, []);

  async function toggleAd(next) {
    setUseAd(next);
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useAdPrefix: next }) });
  }

  async function moveToSchedule() {
    const ids = [...sel]; if (!ids.length) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await fetch('/api/recipients/move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, scheduled: true }) }).then((r) => r.json());
      if (r.ok) { setMsg(`${r.moved}건을 예약 발송 리스트로 옮겼습니다. (좌측 '예약 발송' 탭에서 설정)`); load(); }
      else setErr(r.error);
    } finally { setBusy(false); }
  }

  async function saveMemo(id, memo) {
    await fetch('/api/recipients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, memo }) });
    setMemoSaved(id);
    setTimeout(() => setMemoSaved(''), 1200);
  }

  // 발송 대기(ready)인 행만 선택 대상
  const readyItems = items.filter((r) => r.sendStatus === 'ready');

  function toggle(id) {
    const next = new Set(sel);
    next.has(id) ? next.delete(id) : next.add(id);
    setSel(next);
  }
  function toggleAll() {
    if (sel.size === readyItems.length) setSel(new Set());
    else setSel(new Set(readyItems.map((r) => r._id)));
  }

  // 발송 (ids 비우면 대기 전체, 채우면 선택분만)
  async function send(ids, force = false) {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, force, limit: 200, ids: ids || [] }),
      }).then((r) => r.json());
      if (r.ok) {
        setMsg(`발송 완료: 성공 ${r.sent} · 실패 ${r.failed} · 건너뜀 ${r.skipped}`);
        load();
      } else setErr(r.error);
    } finally { setBusy(false); }
  }

  // 발송리스트 취소 → 1차 검토로 되돌리기
  async function cancelToReview() {
    const ids = [...sel];
    if (!ids.length) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await fetch('/api/recipients/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }).then((r) => r.json());
      if (r.ok) {
        setMsg(`발송리스트에서 ${r.cancelled}건 취소 → 1차 검토로 되돌렸습니다.`);
        load();
      } else setErr(r.error);
    } finally { setBusy(false); }
  }

  async function sendTest() {
    if (!testEmail) return;
    setBusy(true); setTestMsg(''); setErr('');
    try {
      const r = await fetch('/api/send/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail, category: cat }),
      }).then((r) => r.json());
      if (r.ok) setTestMsg(`✅ ${testEmail} 로 테스트 메일을 보냈습니다. (현재 카테고리 양식)`);
      else setErr(r.error);
    } finally { setBusy(false); }
  }

  const ready = counts.ready || 0;

  return (
    <div>
      <h1 className="page-title">발송 리스트 (2차 DB)</h1>
      <p className="page-sub">
        건별로 선택해 <strong>발송</strong>하거나 <strong>발송리스트 취소</strong>(→1차 검토로 되돌리기)할 수 있습니다.
        (광고) 표기·수신거부·야간(21~08시) 차단이 적용됩니다.
      </p>

      {/* 테스트 메일 */}
      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent-2)' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>🧪 테스트 메일 전송</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="내 이메일 주소 입력 (예: me@yogibo.co.kr)"
            style={{ flex: 1, minWidth: 240, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)' }}
          />
          <button className="btn" onClick={sendTest} disabled={busy || !testEmail}>
            {busy ? '전송 중…' : '테스트 발송'}
          </button>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
          현재 선택된 카테고리 양식으로, 입력한 주소에 실제와 동일한 메일((광고)·수신거부 포함)을 1통 보냅니다. 발송 이력엔 기록되지 않습니다.
        </div>
        {testMsg && <div style={{ color: 'var(--good)', fontSize: 13, marginTop: 8 }}>{testMsg}</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`btn ${c.key === cat ? '' : 'secondary'}`} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="cards" style={{ marginBottom: 16 }}>
        <Mini label="발송 대기" v={counts.ready || 0} />
        <Mini label="발송 완료" v={counts.sent || 0} />
        <Mini label="실패" v={counts.failed || 0} />
        <Mini label="수신거부" v={counts.unsubscribed || 0} />
      </div>

      {err && <div className="card" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', marginBottom: 12 }}>{err}</div>}
      {msg && <div className="card" style={{ borderColor: 'var(--good)', color: 'var(--good)', marginBottom: 12 }}>{msg}</div>}

      {/* (광고) 표기 토글 — 마케터 직접 관리 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={useAd} onChange={(e) => toggleAd(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            <span style={{ fontWeight: 600 }}>제목에 <b>(광고)</b> 표기</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: useAd ? 'var(--good)' : 'var(--bad)' }}>{useAd ? 'ON (준수)' : 'OFF'}</span>
            <div style={{ color: 'var(--warn)', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>
              ⚠ 정보통신망법상 광고성 메일은 <b>(광고) 표기가 의무</b>입니다. 끄면 법 위반(과태료) 소지가 있으니 회사 책임하에 결정하세요. (모든 발송·테스트에 즉시 반영)
            </div>
          </span>
        </label>
      </div>

      {/* 액션 바 */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => send([...sel])} disabled={busy || !sel.size}>
          ✉️ 선택 발송 ({sel.size})
        </button>
        <button className="btn secondary" onClick={cancelToReview} disabled={busy || !sel.size} title="1차 검토로 되돌리기">
          ↩ 발송리스트 취소 ({sel.size})
        </button>
        <span style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        <button className="btn secondary" onClick={() => send([])} disabled={busy || !ready}>
          {busy ? '처리 중…' : `대기 전체 발송 (${ready})`}
        </button>
        <button className="btn secondary" onClick={() => send([...sel], true)} disabled={busy || !sel.size} title="야간 차단 무시">
          야간차단 무시(선택)
        </button>
        <span style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        <button className="btn secondary" onClick={moveToSchedule} disabled={busy || !sel.size} title="예약 발송 탭으로 이동" style={{ borderColor: 'var(--accent-2)' }}>
          ⏰ 예약 발송으로 옮기기 ({sel.size})
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox" checked={readyItems.length > 0 && sel.size === readyItems.length} onChange={toggleAll} />
              </th>
              <th>업체</th><th>이메일</th><th style={{ width: 80 }}>상태</th><th style={{ width: 130 }}>발송시각</th><th style={{ width: 220 }}>관리 메모</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r._id}>
                <td>
                  {r.sendStatus === 'ready' ? (
                    <input type="checkbox" checked={sel.has(r._id)} onChange={() => toggle(r._id)} />
                  ) : null}
                </td>
                <td>{r.companyName || '-'}</td>
                <td>{r.email}</td>
                <td><span className={`badge ${r.sendStatus}`}>{sendLabel(r.sendStatus)}</span></td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{r.sentAt ? new Date(r.sentAt).toLocaleString('ko-KR') : '-'}</td>
                <td>
                  <input
                    defaultValue={r.memo || ''}
                    onBlur={(e) => { if ((e.target.value || '') !== (r.memo || '')) saveMemo(r._id, e.target.value); }}
                    placeholder="메모 입력…"
                    style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', fontSize: 12 }}
                  />
                  {memoSaved === r._id && <span style={{ color: 'var(--good)', fontSize: 11 }}>저장됨</span>}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>발송 리스트가 비어있습니다. 1차 검토에서 승인하세요.</td></tr>}
          </tbody>
        </table>
      </div>


      {/* 날짜별 발송 이력 — 기간 설정 */}
      <h2 style={{ fontSize: 15, marginTop: 32 }}>📅 날짜별 발송 이력</h2>
      <div className="card" style={{ marginTop: 8, marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="kpi-label">기간</span>
        <input type="date" value={rangeStart} max={rangeEnd} onChange={(e) => setRangeStart(e.target.value)} style={dateInp} />
        <span style={{ color: 'var(--muted)' }}>~</span>
        <input type="date" value={rangeEnd} min={rangeStart} onChange={(e) => setRangeEnd(e.target.value)} style={dateInp} />
        <span style={{ width: 1, height: 22, background: 'var(--border)' }} />
        <button className="btn secondary" style={{ padding: '6px 12px' }} onClick={() => { setRangeStart(KST_TODAY); setRangeEnd(KST_TODAY); }}>오늘</button>
        <button className="btn secondary" style={{ padding: '6px 12px' }} onClick={() => { const d = new Date(Date.now() + 9 * 3600e3 - 6 * 86400e3).toISOString().slice(0, 10); setRangeStart(d); setRangeEnd(KST_TODAY); }}>최근 7일</button>
        <button className="btn secondary" style={{ padding: '6px 12px' }} onClick={() => { const d = new Date(Date.now() + 9 * 3600e3 - 29 * 86400e3).toISOString().slice(0, 10); setRangeStart(d); setRangeEnd(KST_TODAY); }}>최근 30일</button>
      </div>
      {(() => {
        const inRange = history.filter((h) => h.date >= rangeStart && h.date <= rangeEnd);
        if (inRange.length === 0) return <div className="card" style={{ color: 'var(--muted)' }}>{rangeStart} ~ {rangeEnd} · 발송 내역이 없습니다.</div>;
        const totalSent = inRange.reduce((a, d) => a + d.sent, 0);
        return (
          <>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>{rangeStart} ~ {rangeEnd} · {inRange.length}일 · 총 발송 {totalSent}건</div>
            {inRange.map((day) => (
              <div key={day.date} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>{day.date}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>대상 {day.total} · 발송 {day.sent}</span>
                </div>
                <table>
                  <thead>
                    <tr><th style={{ width: 60 }}>시각</th><th style={{ width: 130 }}>카테고리</th><th>제목</th><th style={{ width: 90 }}>발송/대상</th></tr>
                  </thead>
                  <tbody>
                    {day.items.map((c) => (
                      <tr key={c._id}>
                        <td style={{ color: 'var(--muted)' }}>{c.time}</td>
                        <td>{c.categoryLabel}</td>
                        <td>{c.subject}</td>
                        <td>{c.sentCount}/{c.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        );
      })()}
    </div>
  );
}

const dateInp = { padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', fontFamily: 'inherit' };

function Mini({ label, v }) {
  return (
    <div className="card">
      <div className="kpi">{v}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
