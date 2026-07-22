'use client';
import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/categories';

export default function SendPage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);

  const load = useCallback(async () => {
    const [r, h] = await Promise.all([
      fetch(`/api/recipients?category=${cat}&limit=200`).then((r) => r.json()),
      fetch(`/api/campaigns?category=${cat}`).then((r) => r.json()),
    ]);
    if (r.ok) {
      setItems(r.items);
      setCounts(r.counts);
    } else setErr(r.error);
    if (h.ok) setHistory(h.days);
  }, [cat]);

  useEffect(() => {
    load();
  }, [load]);

  async function send(force = false) {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const r = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, limit: Number(limit), force }),
      }).then((r) => r.json());
      if (r.ok) {
        setMsg(`발송 완료: 성공 ${r.sent} · 실패 ${r.failed} · 건너뜀 ${r.skipped}`);
        load();
      } else {
        setErr(r.error);
      }
    } finally {
      setBusy(false);
    }
  }

  const ready = counts.ready || 0;

  return (
    <div>
      <h1 className="page-title">발송 리스트 (2차 DB)</h1>
      <p className="page-sub">승인된 타깃에 카테고리 양식으로 발송합니다. (광고) 표기·수신거부·야간(21~08시) 차단이 적용됩니다.</p>

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

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          <span className="kpi-label">1회 발송 수 </span>
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} style={{ ...inputStyle, width: 90, display: 'inline-block' }} />
        </label>
        <button className="btn" onClick={() => send(false)} disabled={busy || !ready}>
          {busy ? '발송 중…' : `발송 실행 (대기 ${ready}건)`}
        </button>
        <button className="btn secondary" onClick={() => send(true)} disabled={busy || !ready} title="야간 차단 무시">
          야간차단 무시 발송
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>업체</th><th>이메일</th><th>상태</th><th>발송시각</th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r._id}>
                <td>{r.companyName || '-'}</td>
                <td>{r.email}</td>
                <td><span className={`badge ${r.sendStatus}`}>{r.sendStatus}</span></td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{r.sentAt ? new Date(r.sentAt).toLocaleString('ko-KR') : '-'}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>발송 리스트가 비어있습니다. 1차 검토에서 승인하세요.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 날짜별 발송 이력 */}
      <h2 style={{ fontSize: 15, marginTop: 32 }}>📅 날짜별 발송 이력</h2>
      {history.length === 0 ? (
        <div className="card" style={{ marginTop: 8, color: 'var(--muted)' }}>아직 발송 이력이 없습니다.</div>
      ) : (
        history.map((day) => (
          <div key={day.date} className="card" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>{day.date}</strong>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>대상 {day.total} · 발송 {day.sent}</span>
            </div>
            <table>
              <thead>
                <tr><th style={{ width: 60 }}>시각</th><th style={{ width: 140 }}>카테고리</th><th>제목</th><th style={{ width: 100 }}>발송/대상</th></tr>
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
        ))
      )}
    </div>
  );
}

const inputStyle = {
  padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)',
};

function Mini({ label, v }) {
  return (
    <div className="card">
      <div className="kpi">{v}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
