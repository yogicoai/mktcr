'use client';
import { useState, useEffect } from 'react';
import { CATEGORIES } from '@/lib/categories';

export default function TemplatesPage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [all, setAll] = useState({});
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((r) => {
        if (r.ok) {
          const map = {};
          r.templates.forEach((t) => (map[t.category] = t));
          setAll(map);
        } else setErr(r.error);
      });
  }, []);

  useEffect(() => {
    const t = all[cat];
    if (t) {
      setSubject(t.subject);
      setBodyHtml(t.bodyHtml);
    }
  }, [cat, all]);

  async function save() {
    setMsg('');
    setErr('');
    const r = await fetch('/api/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat, subject, bodyHtml }),
    }).then((r) => r.json());
    if (r.ok) {
      setAll({ ...all, [cat]: { ...all[cat], subject, bodyHtml } });
      setMsg('저장했습니다.');
    } else setErr(r.error);
  }

  return (
    <div>
      <h1 className="page-title">메일 양식</h1>
      <p className="page-sub">
        카테고리별 제목·본문. <code>{'{{companyName}}'}</code> 치환 지원. 발송 시 제목 <strong>(광고)</strong> 표기와
        본문 하단 <strong>발신자 정보·수신거부 링크</strong>가 자동 삽입됩니다.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`btn ${c.key === cat ? '' : 'secondary'}`} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      {err && <div className="card" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', marginBottom: 12 }}>{err}</div>}
      {msg && <div className="card" style={{ borderColor: 'var(--good)', color: 'var(--good)', marginBottom: 12 }}>{msg}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="kpi-label" style={{ marginBottom: 6 }}>제목</div>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} />
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>미리보기: (광고) {subject}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="kpi-label" style={{ marginBottom: 6 }}>본문 (HTML)</div>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            style={{ ...inputStyle, minHeight: 320, fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
        <div className="card">
          <div className="kpi-label" style={{ marginBottom: 6 }}>미리보기</div>
          <div
            style={{ background: '#fff', color: '#222', borderRadius: 8, padding: 16, minHeight: 320, overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: bodyHtml.replace(/\{\{companyName\}\}/g, '○○기업') }}
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={save}>저장</button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)',
};
