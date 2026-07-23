'use client';
import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { aiLabel } from '@/lib/labels';

const AI_FILTER_LABELS = { pending: '검증 대기', valid: '적합', invalid: '부적합', all: '전체' };

export default function ReviewPage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [aiFilter, setAiFilter] = useState('valid');
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [manual, setManual] = useState({ companyName: '', email: '', url: '' });
  const [manualMsg, setManualMsg] = useState('');
  const [memoSaved, setMemoSaved] = useState('');

  const load = useCallback(async () => {
    const q = new URLSearchParams({ category: cat, status: 'pending', limit: '300' });
    if (aiFilter !== 'all') q.set('aiStatus', aiFilter);
    const r = await fetch(`/api/leads?${q}`).then((r) => r.json());
    if (r.ok) { setLeads(r.items); setCounts(r.counts); setSel(new Set()); } else setErr(r.error);
  }, [cat, aiFilter]);
  useEffect(() => { load(); }, [load]);

  async function runAI() {
    setBusy('ai'); setErr(''); setMsg('');
    try {
      const r = await fetch('/api/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: cat, limit: 50 }) }).then((r) => r.json());
      if (r.ok) { setMsg(`AI 검증 완료: ${r.validated}건 (적합 ${r.valid} / 부적합 ${r.invalid})`); load(); } else setErr(r.error);
    } finally { setBusy(''); }
  }
  async function addManual() {
    setManualMsg('');
    if (!manual.email) { setManualMsg('❌ 이메일을 입력하세요.'); return; }
    const r = await fetch('/api/leads/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...manual, category: cat }) }).then((r) => r.json());
    if (r.ok) { setManualMsg('✅ 추가되었습니다. 아래에서 승인하세요.'); setManual({ companyName: '', email: '', url: '' }); load(); }
    else setManualMsg('❌ ' + r.error);
  }
  async function saveMemo(id, memo) {
    await fetch('/api/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, memo }) });
    setMemoSaved(id); setTimeout(() => setMemoSaved(''), 1200);
  }
  async function review(action) {
    const ids = [...sel]; if (!ids.length) return;
    setBusy(action); setErr(''); setMsg('');
    try {
      const r = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, action }) }).then((r) => r.json());
      if (r.ok) { setMsg(action === 'approve' ? `승인 ${r.approved}건 · 발송리스트 이관 ${r.moved}건` : `반려 ${r.rejected}건`); load(); } else setErr(r.error);
    } finally { setBusy(''); }
  }
  function toggle(id) { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); }
  function toggleAll() { setSel(sel.size === leads.length ? new Set() : new Set(leads.map((l) => l._id))); }

  return (
    <div>
      <h1 className="page-title">검토 · 승인</h1>
      <p className="page-sub">
        <b style={{ color: 'var(--good)' }}>AI 1차 검증이 완료된 리드</b>입니다. 마케터가 확인해 <b>승인</b>하면 발송 리스트로 이관됩니다.
        아직 미검증 리드는 「AI 검증 실행」으로 판정하세요.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`btn ${c.key === cat ? '' : 'secondary'}`} onClick={() => setCat(c.key)}>{c.label}</button>
        ))}
      </div>

      {/* 업체 직접 추가 */}
      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--good)' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>➕ 업체 직접 추가 (아는 업체 입력)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={manual.companyName} onChange={(e) => setManual({ ...manual, companyName: e.target.value })} placeholder="업체명" style={{ ...inp, width: 170 }} />
          <input value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} placeholder="담당자 이메일 (필수)" style={{ ...inp, width: 220 }} />
          <input value={manual.url} onChange={(e) => setManual({ ...manual, url: e.target.value })} placeholder="홈페이지(선택)" style={{ ...inp, width: 180 }} />
          <button className="btn" onClick={addManual}>추가</button>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>→ <b>{CATEGORIES.find((c) => c.key === cat)?.label}</b>에 적합으로 등록</span>
        </div>
        {manualMsg && <div style={{ fontSize: 13, marginTop: 8, color: manualMsg.startsWith('✅') ? 'var(--good)' : 'var(--bad)' }}>{manualMsg}</div>}
      </div>

      {/* 진행 현황 */}
      {counts && (
        <div className="cards" style={{ marginBottom: 16 }}>
          <Stat label="수집 전체" v={counts.total} />
          <Stat label="AI 미검증" v={counts.aiPending} tone="warn" />
          <Stat label="AI 적합" v={counts.aiValid} tone="good" />
          <Stat label="검토 대기 (미승인)" v={counts.reviewPending} tone="warn" />
          <Stat label="승인 완료" v={counts.approved} tone="accent" />
          <Stat label="반려" v={counts.rejected} tone="bad" />
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn secondary" onClick={runAI} disabled={!!busy}>
          {busy === 'ai' ? 'AI 검증 중…' : 'AI 검증 실행 (미검증 50건)'}
        </button>
        <span style={{ color: 'var(--muted)' }}>필터:</span>
        {['pending', 'valid', 'invalid', 'all'].map((f) => (
          <button key={f} className="btn secondary" style={{ opacity: aiFilter === f ? 1 : 0.5 }} onClick={() => setAiFilter(f)}>{AI_FILTER_LABELS[f]}</button>
        ))}
      </div>

      {err && <div className="card" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', marginBottom: 12 }}>{err}</div>}
      {msg && <div className="card" style={{ borderColor: 'var(--good)', color: 'var(--good)', marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn" onClick={() => review('approve')} disabled={!sel.size || !!busy}>✅ 선택 승인 → 발송리스트 ({sel.size})</button>
        <button className="btn secondary" onClick={() => review('reject')} disabled={!sel.size || !!busy}>선택 반려</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}><input type="checkbox" checked={leads.length > 0 && sel.size === leads.length} onChange={toggleAll} /></th>
              <th>업체</th><th>이메일</th><th style={{ width: 50 }}>AI</th><th style={{ width: 50 }}>점수</th><th>AI 판정 근거</th><th style={{ width: 200 }}>관리 메모</th>
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
                <td>
                  <input defaultValue={l.memo || ''} onBlur={(e) => { if ((e.target.value || '') !== (l.memo || '')) saveMemo(l._id, e.target.value); }} placeholder="메모…"
                    style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', fontSize: 12 }} />
                  {memoSaved === l._id && <span style={{ color: 'var(--good)', fontSize: 11 }}>저장됨</span>}
                </td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>해당 조건의 리드가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', fontFamily: 'inherit' };
const TONE = { good: 'var(--good)', warn: 'var(--warn)', accent: 'var(--accent)', bad: 'var(--bad)' };
function Stat({ label, v, tone }) {
  return <div className="card" style={{ padding: 14 }}><div style={{ fontSize: 24, fontWeight: 800, color: TONE[tone] || 'var(--text)' }}>{v ?? 0}</div><div className="kpi-label">{label}</div></div>;
}
