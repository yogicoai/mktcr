import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/** 조회 — 아이디/비밀번호 값은 노출하지 않고 설정 여부만 반환 */
export async function GET() {
  try {
    const s = await getSettings();
    return NextResponse.json({
      ok: true,
      settings: {
        smtpHost: s.smtpHost,
        smtpPort: s.smtpPort,
        smtpSecure: s.smtpSecure,
        mailFromName: s.mailFromName,
        mailFromAddress: s.mailFromAddress,
        companyName: s.companyName,
        companyAddr: s.companyAddr,
        companyTel: s.companyTel,
        useAdPrefix: s.useAdPrefix !== false,
        // 보안: 값 대신 설정 여부만
        hasUser: Boolean(s.smtpUser),
        hasPass: Boolean(s.smtpPass),
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/** 저장 — 빈 아이디/비밀번호는 무시(기존값 유지) */
export async function PUT(req) {
  try {
    const body = await req.json();
    const allow = ['smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPass',
      'mailFromName', 'mailFromAddress', 'companyName', 'companyAddr', 'companyTel', 'useAdPrefix'];
    const patch = {};
    for (const k of allow) if (k in body) patch[k] = body[k];
    if ('smtpPort' in patch) patch.smtpPort = Number(patch.smtpPort) || 465;
    await saveSettings(patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
