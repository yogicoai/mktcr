'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [f, setF] = useState({
    smtpHost: '', smtpPort: 465, smtpSecure: true,
    smtpUser: '', smtpPass: '',
    mailFromName: '', mailFromAddress: '',
    companyName: '', companyAddr: '', companyTel: '',
    useAdPrefix: true,
  });
  const [hasUser, setHasUser] = useState(false);
  const [hasPass, setHasPass] = useState(false);
  const [pwEdit, setPwEdit] = useState(false);
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
          useAdPrefix: s.useAdPrefix !== false,
          smtpUser: s.smtpUser || '', smtpPass: '',
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
      setPwEdit(false);
      setF({ ...f, smtpPass: '' }); // 아이디는 유지 표시, 비번만 초기화
    } else setErr(r.error);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 className="page-title">발송 설정</h1>
      <p className="page-sub">메일 발송에 필요한 정보를 여기서 관리합니다(.env 수정 불필요). <b>현재 저장된 아이디는 표시</b>되고, 비밀번호는 보안상 <b>••••</b>로만 보이며 클릭해서 변경할 수 있습니다.</p>

      {err && <div className="card" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', marginBottom: 12 }}>{err}</div>}
      {msg && <div className="card" style={{ borderColor: 'var(--good)', color: 'var(--good)', marginBottom: 12 }}>{msg}</div>}

      <Section title="메일 계정 (마케터는 이것만 입력하면 됩니다)">
        <div style={{ background: 'rgba(91,140,255,.1)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
          메일 서버는 <b style={{ color: 'var(--text)' }}>{f.smtpHost}</b> 로 자동 설정됩니다. <b style={{ color: 'var(--text)' }}>아이디·비밀번호만</b> 입력하세요.
          발신 주소는 입력한 아이디로 자동 발송됩니다.
        </div>
        <Field label={`아이디(계정)  ${hasUser ? '· 현재 로그인 계정 ✅' : '· 미설정'}`}>
          <input style={inp} value={f.smtpUser} onChange={set('smtpUser')} placeholder="메일 계정 아이디 (예: hjs@yogico.kr)" autoComplete="off" />
        </Field>
        <Field label={`비밀번호  ${hasPass ? '· 현재 로그인됨 🔒' : '· 미설정'}`}>
          {hasPass && !pwEdit ? (
            <input style={{ ...inp, cursor: 'pointer' }} type="text" readOnly value="••••••••••"
              onFocus={() => setPwEdit(true)} onClick={() => setPwEdit(true)} title="클릭해서 비밀번호 변경" />
          ) : (
            <input style={inp} type="password" value={f.smtpPass} onChange={set('smtpPass')}
              placeholder="새 비밀번호 입력" autoComplete="new-password" autoFocus={pwEdit} />
          )}
          {hasPass && (
            <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>
              {pwEdit ? '새 비밀번호를 입력하세요. (빈칸으로 저장하면 기존 비번 유지)' : '••••로 표시됨 — 변경하려면 클릭'}
            </div>
          )}
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

      <Section title="발송 옵션">
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.useAdPrefix} onChange={set('useAdPrefix')} style={{ marginTop: 3 }} />
          <span>
            <span style={{ fontWeight: 600 }}>제목에 <b>(광고)</b> 표기</span>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>
              정보통신망법 제50조상 <b style={{ color: 'var(--warn)' }}>영리목적 광고성 메일은 (광고) 표기가 의무</b>입니다.
              끄면 제목에 (광고)가 붙지 않지만 <b style={{ color: 'var(--bad)' }}>법 위반(과태료) 소지</b>가 있으니 신중히 결정하세요.
            </div>
          </span>
        </label>
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
