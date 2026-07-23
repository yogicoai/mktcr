'use client';
import { useState, useEffect } from 'react';
import { CATEGORIES } from '@/lib/categories';

export default function TestSendPage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [tpls, setTpls] = useState({});
  const [to, setTo] = useState('leshwann@naver.com');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/templates').then((r) => r.json()).then((r) => {
      if (r.ok) {
        const m = {};
        r.templates.forEach((t) => (m[t.category] = t));
        setTpls(m);
      } else setErr(r.error);
    });
  }, []);

  const tpl = tpls[cat];
  const previewBody = (tpl?.bodyHtml || '').replace(/\{\{companyName\}\}/g, '○○기업');

  async function sendTest() {
    if (!to) return;
    setBusy(true); setMsg(''); setErr('');
    try {
      const r = await fetch('/api/send/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, category: cat }),
      }).then((r) => r.json());
      if (r.ok) setMsg(`✅ ${to} 로 "${CATEGORIES.find((c) => c.key === cat)?.label}" 양식 테스트 메일을 보냈습니다.`);
      else setErr(r.error);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="page-title">테스트 발송</h1>
      <p className="page-sub">내 이메일로 각 카테고리 양식이 실제 어떻게 보이는지 미리 받아볼 수 있습니다. (발송 이력엔 기록되지 않습니다)</p>

      {/* 카테고리(양식) 선택 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`btn ${c.key === cat ? '' : 'secondary'}`} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      {err && <div className="card" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', marginBottom: 12 }}>{err}</div>}
      {msg && <div className="card" style={{ borderColor: 'var(--good)', color: 'var(--good)', marginBottom: 12 }}>{msg}</div>}

      {/* 발송 바 */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="받을 이메일 주소"
          style={{ flex: 1, minWidth: 260, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)' }}
        />
        <button className="btn" onClick={sendTest} disabled={busy || !to}>
          {busy ? '전송 중…' : '이 양식으로 테스트 발송'}
        </button>
      </div>

      {/* 미리보기 */}
      <h2 style={{ fontSize: 15 }}>미리보기 — 실제로 이렇게 발송됩니다</h2>
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>제목</div>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>[테스트] (광고) {tpl?.subject || ''}</div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>본문</div>
        <div style={{ background: '#fff', color: '#222', borderRadius: 10, padding: '24px 28px' }}
             dangerouslySetInnerHTML={{ __html: previewBody }} />
        <div style={{ background: '#fff', color: '#888', borderRadius: '0 0 10px 10px', padding: '0 28px 18px', fontSize: 12, lineHeight: 1.6 }}>
          <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '8px 0 12px' }} />
          ※ (자동 삽입) 본 메일은 정보통신망법에 따른 <b>광고성 정보</b>이며 … · 주식회사 요기보 · <span style={{ color: '#5b8cff' }}>수신거부</span> 링크
        </div>
      </div>

      <p className="page-sub" style={{ marginTop: 12, fontSize: 12 }}>
        ※ 실제 발송에는 제목에 <b>(광고)</b>가 붙고, 본문 하단에 <b>발신자 정보·수신거부 링크</b>가 자동으로 삽입됩니다.
        발송이 안 되면 <b>발송 설정</b>에서 메일 계정(아이디·비밀번호)을 먼저 입력하세요.
      </p>
    </div>
  );
}
