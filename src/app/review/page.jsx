'use client';
import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { aiLabel } from '@/lib/labels';

const AI_FILTER_LABELS = { pending: '검증 대기', valid: '적합', invalid: '부적합', all: '전체' };

export default function ReviewPage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [aiFilter, setAiFilter] = useState('valid'); // pending|valid|invalid|all
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const q = new URLSearchParams({ category: cat, status: 'pending', limit: '200' });
    if (aiFilter !== 'all') q.set('aiStatus', aiFilter);
    const r = await fetch(`/api/leads?${q}`).then((r) => r.json());
    if (r.ok) {
      setLeads(r.items);
      setCounts(r.counts);
      setSel(new Set());
    } else setErr(r.error);
  }, [cat, aiFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAI() {
    setBusy('ai');
    setErr('');
    setMsg('');
    try {
      const r = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, limit: 50 }),
      }).then((r) => r.json());
      if (r.ok) {
        setMsg(`AI 검증 완료: ${r.validated}건 (적합 ${r.valid} / 부적합 ${r.invalid})`);
        load();
      } else setErr(r.error);
    } finally {
      setBusy('');
    }
  }

  async function review(action) {
    const ids = [...sel];
    if (!ids.length) return;
    setBusy(action);
    setErr('');
    try {
      const r = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      }).then((r) => r.json());
      if (r.ok) {
        setMsg(action === 'approve' ? `승인 ${r.approved}건 · 발송리스트 이관 ${r.moved}건` : `반려 ${r.rejected}건`);
        load();
      } else setErr(r.error);
    } finally {
      setBusy('');
    }
  }

  function toggle(id) {
    const next = new Set(sel);
    next.has(id) ? next.delete(id) : next.add(id);
    setSel(next);
  }
  function toggleAll() {
    if (sel.size === leads.length) setSel(new Set());
    else setSel(new Set(leads.map((l) => l._id)));
  }

  return (
    <div>
      <h1 className="page-title">1차 검토 (AI)</h1>
      <p className="page-sub">「AI 1차 검증 실행」으로 수집 리드를 규모·적합성 판정합니다. <b style={{ color: 'var(--good)' }}>적합</b> 리드는 자동으로 <b>2차 마케터 검토</b>로 넘어갑니다.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`btn ${c.key === cat ? '' : 'secondary'}`} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      {/* 카테고리별 검토 진행 현황 */}
      {counts && (
        <div className="cards" style={{ marginBottom: 16 }}>
          <Stat label="수집 전체" v={counts.total} />
          <Stat label="AI 미검증" v={counts.aiPending} tone="warn" />
          <Stat label="AI 적합 (→2차로)" v={counts.aiValid} tone="good" />
          <Stat label="AI 부적합" v={counts.aiInvalid} tone="bad" />
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={runAI} disabled={!!busy}>
          {busy === 'ai' ? 'AI 검증 중…' : 'AI 1차 검증 실행 (미검증 50건)'}
        </button>
        <span style={{ color: 'var(--muted)' }}>필터:</span>
        {['pending', 'valid', 'invalid', 'all'].map((f) => (
          <button key={f} className="btn secondary" style={{ opacity: aiFilter === f ? 1 : 0.5 }} onClick={() => setAiFilter(f)}>
            {AI_FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {err && <div className="card" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', marginBottom: 12 }}>{err}</div>}
      {msg && <div className="card" style={{ borderColor: 'var(--good)', color: 'var(--good)', marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button className="btn secondary" onClick={() => review('reject')} disabled={!sel.size || !!busy}>
          선택 제외(반려) ({sel.size})
        </button>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>AI <b style={{ color: 'var(--good)' }}>적합</b> 리드는 자동으로 <b>2차 마케터 검토</b>로 넘어갑니다. 명백히 안 맞는 건만 여기서 제외하세요.</span>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox" checked={leads.length > 0 && sel.size === leads.length} onChange={toggleAll} />
              </th>
              <th>업체</th>
              <th>이메일</th>
              <th style={{ width: 50 }}>AI</th>
              <th style={{ width: 50 }}>점수</th>
              <th>판정 근거</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l._id} style={{ opacity: l.aiStatus === 'invalid' ? 0.55 : 1 }}>
                <td><input type="checkbox" checked={sel.has(l._id)} onChange={() => toggle(l._id)} /></td>
                <td>{l.companyName || '-'}</td>
                <td>{l.email}</td>
                <td><span className={`badge ${l.aiStatus}`}>{aiLabel(l.aiStatus)}</span></td>
                <td>{l.aiScore ?? '-'}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{l.aiReason || '-'}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>해당 조건의 리드가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TONE = { good: 'var(--good)', warn: 'var(--warn)', accent: 'var(--accent)', bad: 'var(--bad)' };
function Stat({ label, v, tone }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: TONE[tone] || 'var(--text)' }}>{v ?? 0}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
