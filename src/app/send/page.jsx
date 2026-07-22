'use client';
import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { sendLabel } from '@/lib/labels';

export default function SendPage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);
  const [sel, setSel] = useState(new Set());

  const load = useCallback(async () => {
    const [r, h] = await Promise.all([
      fetch(`/api/recipients?category=${cat}&limit=200`).then((r) => r.json()),
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

  const ready = counts.ready || 0;

  return (
    <div>
      <h1 className="page-title">발송 리스트 (2차 DB)</h1>
      <p className="page-sub">
        건별로 선택해 <strong>발송</strong>하거나 <strong>발송리스트 취소</strong>(→1차 검토로 되돌리기)할 수 있습니다.
        (광고) 표기·수신거부·야간(21~08시) 차단이 적용됩니다.
      </p>

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
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox" checked={readyItems.length > 0 && sel.size === readyItems.length} onChange={toggleAll} />
              </th>
              <th>업체</th><th>이메일</th><th style={{ width: 90 }}>상태</th><th style={{ width: 150 }}>발송시각</th>
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
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>발송 리스트가 비어있습니다. 1차 검토에서 승인하세요.</td></tr>}
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

function Mini({ label, v }) {
  return (
    <div className="card">
      <div className="kpi">{v}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
