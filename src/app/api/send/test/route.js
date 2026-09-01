import { NextResponse } from 'next/server';
import { getTemplate } from '@/lib/email/templates';
import { sendMail } from '@/lib/email/smtp';
import { getSettings } from '@/lib/settings';
import { adSubject, withComplianceFooter, renderTemplate, logoHeader } from '@/lib/email/compliance';
import { CATEGORY_KEYS } from '@/lib/categories';

export const dynamic = 'force-dynamic';

/**
 * 테스트 메일 발송 — 입력한 주소로 실제 양식(광고표기·수신거부 포함) 1통 발송.
 * body: { to, category?='resort' }
 * recipients/campaigns 에 기록하지 않음. 야간차단 미적용(테스트).
 */
export async function POST(req) {
  try {
    const { to, category = 'resort' } = await req.json();
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('올바른 이메일 주소를 입력하세요.');
    const cat = CATEGORY_KEYS.includes(category) ? category : 'resort';

    const tpl = await getTemplate(cat);
    if (!tpl) throw new Error('메일 양식이 없습니다.');
    const s = await getSettings();
    const company = { name: s.companyName, addr: s.companyAddr, tel: s.companyTel };

    const vars = { companyName: '테스트 수신자' };
    const subject = '[테스트] ' + adSubject(renderTemplate(tpl.subject, vars), s.useAdPrefix !== false);
    const body = renderTemplate(tpl.bodyHtml, vars);
    const html = withComplianceFooter(logoHeader() + body, to, company);

    const messageId = await sendMail({ to, subject, html });
    return NextResponse.json({ ok: true, messageId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
