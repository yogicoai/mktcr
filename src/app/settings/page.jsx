'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [f, setF] = useState({
    smtpHost: '', smtpPort: 465, smtpSecure: true,
    smtpUser: '', smtpPass: '',
    mailFromName: '', mailFromAddress: '',
    companyName: '', companyAddr: '', companyTel: '',
  });
  const [hasUser, setHasUser] = useState(false);
  const [hasPass, setHasPass] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((r) => {
      if (r.ok) {
        const s = r.settings;
        setF((prev) => ({
          ...prev,
          smtpHost: s.smtpHost || '', smtpPort: s.smtpPort || 465, smtpSecure: s.smtpSecure !== false,
          mailFromName: s.mailFromName || '', mailFromAddress: s.mailFromAddress || '',
          companyName: s.companyName || '', companyAddr: s.companyAddr || '', companyTel: s.companyTel || '',
          smtpUser: '', smtpPass: '',
        }));
        setHasUser(s.hasUser); setHasPass(s.hasPass);
      } else setErr(r.error);
    });
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save() {
    setBusy(true); setMsg(''); setErr('');
    // 빈 아이디/비번은 서버가 무시(기존값 유지)
    const body = { ...f };
    if (!body.smtpUser) delete body.smtpUser;
    if (!body.smtpPass) delete body.smtpPass;
    const r = await fetch('/api/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then((r) => r.json());
    setBusy(false);
    if (r.ok) {
      setMsg('저장했습니다.');
      if (f.smtpUser) setHasUser(true);
      if (f.smtpPass) setHasPass(true);
      setF({ ...f, smtpUser: '', smtpPass: '' });
    } else setErr(r.error);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="page-title">발송 설정</h1>
      <p className="page-sub">메일 발송에 필요한 정보를 여기서 관리합니다(.env 수정 불필요). 아이디·비밀번호는 보안상 화면에 표시되지 않으며, 새로 입력할 때만 갱신됩니다.</p>

      {err && <div className="card" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', marginBottom: 12 }}>{err}</div>}
      {msg && <div className="card" style={{ borderColor: 'var(--good)', color: 'var(--good)', marginBottom: 12 }}>{msg}</div>}

      <Section title="메일 계정 (마케터는 이것만 입력하면 됩니다)">
        <div style={{ background: 'rgba(91,140,255,.1)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
          메일 서버는 <b style={{ color: 'var(--text)' }}>{f.smtpHost}</b> 로 자동 설정됩니다. <b style={{ color: 'var(--text)' }}>아이디·비밀번호만</b> 입력하세요.
          발신 주소는 입력한 아이디로 자동 발송됩니다.
        </div>
        <Field label={`아이디(계정)  ${hasUser ? '· 현재: 설정됨 ✅' : '· 미설정'}`}>
          <input style={inp} value={f.smtpUser} onChange={set('smtpUser')} placeholder={hasUser ? '변경 시에만 입력' : '메일 계정 아이디'} autoComplete="off" />
        </Field>
        <Field label={`비밀번호  ${hasPass ? '· 현재: 설정됨 ✅' : '· 미설정'}`}>
          <input style={inp} type="password" value={f.smtpPass} onChange={set('smtpPass')} placeholder={hasPass ? '••••••  (변경 시에만 입력)' : '메일 계정 비밀번호'} autoComplete="new-password" />
        </Field>
      </Section>

      <Section title="발신자 표시 (선택 · 미입력 시 자동)">
        <Field label="발신자 이름"><input style={inp} value={f.mailFromName} onChange={set('mailFromName')} placeholder="요기보 마케팅" /></Field>
        <Field label="발신 이메일 주소 (미입력 시 아이디로 발송)"><input style={inp} value={f.mailFromAddress} onChange={set('mailFromAddress')} placeholder="아이디 계정으로 자동 발송" /></Field>
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>고급: 서버 포트·보안 설정</summary>
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <Field label="SMTP 호스트" flex={2}><input style={inp} value={f.smtpHost} onChange={set('smtpHost')} placeholder="wsmtp.ecount.com" /></Field>
            <Field label="포트" flex={1}><input style={inp} type="number" value={f.smtpPort} onChange={set('smtpPort')} /></Field>
            <Field label="SSL" flex={1}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                <input type="checkbox" checked={f.smtpSecure} onChange={set('smtpSecure')} /> 사용
              </label>
            </Field>
          </div>
        </details>
      </Section>

      <Section title="회사 정보 (법규 준수 — 메일 하단 자동 표기)">
        <Field label="회사명"><input style={inp} value={f.companyName} onChange={set('companyName')} placeholder="주식회사 요기보" /></Field>
        <Field label="주소"><input style={inp} value={f.companyAddr} onChange={set('companyAddr')} placeholder="서울시 ..." /></Field>
        <Field label="연락처"><input style={inp} value={f.companyTel} onChange={set('companyTel')} placeholder="02-000-0000" /></Field>
      </Section>

      <button className="btn" onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
    </div>
  );
}

const inp = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)',
};

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}
function Field({ label, children, flex }) {
  return (
    <label style={{ flex: flex || 'unset' }}>
      <div className="kpi-label" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}
