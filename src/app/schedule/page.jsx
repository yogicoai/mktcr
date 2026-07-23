'use client';
import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { sendLabel } from '@/lib/labels';

const KST_TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export default function SchedulePage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [items, setItems] = useState([]);       // 예약 리스트(scheduled=true)
  const [schedules, setSchedules] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sform, setSform] = useState({ label: '', type: 'weekly', runAtKst: '', timeHM: '09:00', startDate: KST_TODAY, weekdays: [1], force: false });
  const [target, setTarget] = useState('all');  // all(예약 리스트 전체) | selected

  const load = useCallback(async () => {
    const [r, sc] = await Promise.all([
      fetch(`/api/recipients?category=${cat}&scheduled=true&limit=500`).then((r) => r.json()),
      fetch(`/api/schedules`).then((r) => r.json()),
    ]);
    if (r.ok) { setItems(r.items); setSel(new Set()); } else setErr(r.error);
    if (sc.ok) setSchedules(sc.items.filter((s) => s.category === cat));
  }, [cat]);

  useEffect(() => { load(); }, [load]);

  const readyItems = items.filter((r) => r.sendStatus === 'ready');
  function toggle(id) { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); }
  function toggleAll() { setSel(sel.size === readyItems.length ? new Set() : new Set(readyItems.map((r) => r._id))); }

  async function moveBack() {
    const ids = [...sel]; if (!ids.length) return;
    const r = await fetch('/api/recipients/move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, scheduled: false }) }).then((r) => r.json());
    if (r.ok) { setMsg(`${r.moved}건을 발송 리스트로 되돌렸습니다.`); load(); } else setErr(r.error);
  }

  async function createSchedule() {
    setErr(''); setMsg('');
    const ids = target === 'selected' ? [...sel] : readyItems.map((r) => r._id);
    if (!ids.length) { setErr(target === 'selected' ? '업체를 먼저 체크하세요.' : '예약 리스트가 비어있습니다.'); return; }
    const body = { ...sform, category: cat, ids };
    const r = await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
    if (r.ok) { setMsg('예약이 등록되었습니다.'); setSform({ ...sform, label: '' }); load(); } else setErr(r.error);
  }
  async function toggleSchedule(id, enabled) { await fetch('/api/schedules', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, enabled }) }); load(); }
  async function deleteSchedule(id) { await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' }); load(); }

  // 요약 문장
  const targetTxt = target === 'selected' ? `체크한 ${sel.size}개 업체` : `예약 리스트 전체 (${readyItems.length}건)`;
  const wdTxt = sform.type === 'weekly' ? `(${[...sform.weekdays].sort((a, b) => a - b).map((i) => '일월화수목금토'[i]).join('·')})` : '';
  const whenTxt = sform.type === 'once'
    ? (sform.runAtKst ? sform.runAtKst.replace('T', ' ') + '에' : '(일시를 정하세요)')
    : sform.type === 'daily' ? `매일 ${sform.timeHM}, ${sform.startDate}부터` : `매주${wdTxt} ${sform.timeHM}, ${sform.startDate}부터`;
  const summary = `${targetTxt}에 ${whenTxt} 발송합니다.${sform.force ? ' (야간 포함)' : ''}`;

  return (
    <div>
      <h1 className="page-title">예약 발송</h1>
      <p className="page-sub">발송 리스트에서 <strong>예약 발송으로 옮긴 업체</strong>를 모아 예약·주기 발송을 겁니다. 실행에는 스케줄러(<code>npm run scheduler</code>)가 떠 있어야 합니다.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`btn ${c.key === cat ? '' : 'secondary'}`} onClick={() => setCat(c.key)}>{c.label}</button>
        ))}
      </div>

      {err && <div className="card" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', marginBottom: 12 }}>{err}</div>}
      {msg && <div className="card" style={{ borderColor: 'var(--good)', color: 'var(--good)', marginBottom: 12 }}>{msg}</div>}

      {/* 문장형 예약 폼 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, lineHeight: 2.4 }}>
          <select value={target} onChange={(e) => setTarget(e.target.value)} style={chip}>
            <option value="all">예약 리스트 전체</option>
            <option value="selected">체크한 {sel.size}개 업체</option>
          </select>
          <span> 를 </span>
          <select value={sform.type} onChange={(e) => setSform({ ...sform, type: e.target.value })} style={chip}>
            <option value="once">1회만</option>
            <option value="daily">매일</option>
            <option value="weekly">매주</option>
          </select>
          {sform.type === 'weekly' && (
            <span style={{ display: 'inline-flex', gap: 4, margin: '0 4px', verticalAlign: 'middle' }}>
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => {
                const on = sform.weekdays.includes(i);
                return (
                  <button key={i} onClick={() => setSform({ ...sform, weekdays: on ? sform.weekdays.filter((x) => x !== i) : [...sform.weekdays, i] })}
                    style={{ width: 30, height: 30, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, background: on ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : 'var(--panel-2)', color: on ? '#fff' : 'var(--muted)' }}>{d}</button>
                );
              })}
            </span>
          )}
          {sform.type === 'once' ? (
            <><input type="datetime-local" value={sform.runAtKst} onChange={(e) => setSform({ ...sform, runAtKst: e.target.value })} style={chip} /><span> 에 발송</span></>
          ) : (
            <><input type="date" value={sform.startDate} onChange={(e) => setSform({ ...sform, startDate: e.target.value })} style={chip} /><span> 부터 </span><input type="time" value={sform.timeHM} onChange={(e) => setSform({ ...sform, timeHM: e.target.value })} style={chip} /><span> 에 발송</span></>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
            <input type="checkbox" checked={sform.force} onChange={(e) => setSform({ ...sform, force: e.target.checked })} /> 야간(21~08시)에도 발송
          </label>
          <input value={sform.label} onChange={(e) => setSform({ ...sform, label: e.target.value })} placeholder="예약 이름(메모) — 선택" style={{ ...sInp, flex: 1, minWidth: 180 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(91,140,255,.12)', border: '1px solid var(--border-2)', borderRadius: 10, padding: '10px 14px', fontSize: 14, flex: 1, minWidth: 260 }}>
            ▶ <b style={{ color: 'var(--accent)' }}>{CATEGORIES.find((c) => c.key === cat)?.label}</b> 카테고리의 {summary}
          </div>
          <button className="btn" onClick={createSchedule}>예약 추가</button>
        </div>
      </div>

      {/* 예약 목록 */}
      {schedules.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>등록된 예약</div>
          <table>
            <thead><tr><th>이름</th><th>유형</th><th>대상</th><th>시각</th><th>상태</th><th>마지막 실행</th><th style={{ width: 110 }}></th></tr></thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s._id}>
                  <td>{s.label || '-'}</td>
                  <td>{{ once: '1회', daily: '매일', weekly: '매주' }[s.type]}{s.type === 'weekly' ? ` (${s.weekdays.map((i) => '일월화수목금토'[i]).join('')})` : ''}</td>
                  <td>{s.ids && s.ids.length ? `${s.ids.length}건` : '전체'}</td>
                  <td>{s.type === 'once' ? (s.runAtKst || '').replace('T', ' ') : `${s.startDate ? s.startDate.slice(5) + '~ ' : ''}${s.timeHM}`}{s.force ? ' ⚡' : ''}</td>
                  <td><span className={`badge ${s.done ? 'sent' : s.enabled ? 'ready' : 'unsubscribed'}`}>{s.done ? '완료' : s.enabled ? '활성' : '중지'}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString('ko-KR') : '-'}{s.lastResult?.ok ? ` · 성공 ${s.lastResult.sent}` : ''}</td>
                  <td>
                    {!s.done && <button className="btn secondary" style={{ padding: '5px 9px', fontSize: 12 }} onClick={() => toggleSchedule(s._id, !s.enabled)}>{s.enabled ? '중지' : '재개'}</button>}
                    <button className="btn secondary" style={{ padding: '5px 9px', fontSize: 12, marginLeft: 4 }} onClick={() => deleteSchedule(s._id)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 예약 대상 업체 리스트 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn secondary" onClick={moveBack} disabled={!sel.size}>↩ 발송 리스트로 되돌리기 ({sel.size})</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}><input type="checkbox" checked={readyItems.length > 0 && sel.size === readyItems.length} onChange={toggleAll} /></th>
              <th>업체</th><th>이메일</th><th style={{ width: 80 }}>상태</th><th>관리 메모</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r._id}>
                <td>{r.sendStatus === 'ready' ? <input type="checkbox" checked={sel.has(r._id)} onChange={() => toggle(r._id)} /> : null}</td>
                <td>{r.companyName || '-'}</td>
                <td>{r.email}</td>
                <td><span className={`badge ${r.sendStatus}`}>{sendLabel(r.sendStatus)}</span></td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{r.memo || '-'}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>예약 리스트가 비어있습니다. 발송 리스트에서 “예약 발송으로 옮기기”로 업체를 이동하세요.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const sInp = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', fontFamily: 'inherit' };
const chip = { padding: '5px 10px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--panel-2)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, margin: '0 3px', verticalAlign: 'middle' };
