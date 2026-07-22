'use client';
import { useState, useEffect, useRef } from 'react';
import { CATEGORIES } from '@/lib/categories';

export default function TemplatesPage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [all, setAll] = useState({});
  const [subject, setSubject] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const editorRef = useRef(null);

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

  // 카테고리 전환 시 미리보기 편집기에 본문 주입
  useEffect(() => {
    const t = all[cat];
    if (t) {
      setSubject(t.subject);
      if (editorRef.current) editorRef.current.innerHTML = t.bodyHtml || '';
    }
  }, [cat, all]);

  function cmd(command) {
    editorRef.current?.focus();
    document.execCommand(command, false, null);
  }

  async function save() {
    setMsg('');
    setErr('');
    const bodyHtml = editorRef.current?.innerHTML || '';
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
        미리보기 안에서 바로 편집하세요. <code>{'{{companyName}}'}</code>는 발송 시 업체명으로 치환됩니다. 발송 시 제목{' '}
        <strong>(광고)</strong> 표기와 하단 <strong>발신자 정보·수신거부</strong>가 자동 삽입됩니다.
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
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>실제 발송 제목: (광고) {subject}</div>
      </div>

      {/* 편집 툴바 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <ToolBtn onClick={() => cmd('bold')}><b>B</b></ToolBtn>
        <ToolBtn onClick={() => cmd('underline')}><u>U</u></ToolBtn>
        <ToolBtn onClick={() => cmd('insertUnorderedList')}>• 목록</ToolBtn>
        <ToolBtn onClick={() => cmd('justifyLeft')}>좌</ToolBtn>
        <ToolBtn onClick={() => cmd('justifyCenter')}>중앙</ToolBtn>
        <ToolBtn onClick={() => cmd('removeFormat')}>서식해제</ToolBtn>
      </div>

      {/* 미리보기 = 편집 영역 (실제 메일과 동일한 흰 배경) */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        style={{
          background: '#fff',
          color: '#222',
          borderRadius: 10,
          padding: '28px 32px',
          minHeight: 420,
          maxWidth: 680,
          outline: 'none',
          boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
        }}
      />

      {/* 실제 발송 시 자동 삽입되는 푸터 미리보기 */}
      <div style={{ maxWidth: 680, background: '#fff', color: '#888', borderRadius: 10, padding: '12px 32px 20px', marginTop: 2, fontSize: 12, lineHeight: 1.6 }}>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '8px 0 12px' }} />
        <div>※ (자동 삽입) 본 메일은 정보통신망법에 따른 <b>광고성 정보</b>이며 … · 주식회사 요기보 · <span style={{ color: '#5b8cff' }}>수신거부</span> 링크</div>
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

function ToolBtn({ onClick, children }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // 선택영역 유지
        onClick();
      }}
      className="btn secondary"
      style={{ padding: '6px 10px', fontSize: 12 }}
    >
      {children}
    </button>
  );
}
