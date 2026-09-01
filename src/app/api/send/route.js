import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { getTemplate } from '@/lib/email/templates';
import { sendMail } from '@/lib/email/smtp';
import { getSettings } from '@/lib/settings';
import {
  adSubject,
  withComplianceFooter,
  renderTemplate,
  isNightBlocked,
  logoHeader,
} from '@/lib/email/compliance';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 카테고리 발송 리스트(recipients, sendStatus=ready)에 양식 발송.
 * body: { category, limit?=50, force?=false, ids?=[] }
 *   ids 지정 시 해당 수신자만 발송(건별 선택 발송).
 * 정보통신망법: 제목 (광고) 표기, 본문 수신거부, 야간(21~08시) 차단.
 */
export async function POST(req) {
  try {
    const { category, limit = 50, force = false, ids = [] } = await req.json();
    if (!category) throw new Error('category 필요');

    const night = isNightBlocked();
    if (night.blocked && !force) {
      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          error: `야간 발송 제한 시간대입니다 (현재 KST ${night.kstHour}시). 광고성 정보는 21:00~08:00 발송이 제한됩니다.`,
        },
        { status: 400 }
      );
    }

    const tpl = await getTemplate(category);
    if (!tpl) throw new Error('메일 양식이 없습니다');

    const settings = await getSettings();
    const company = { name: settings.companyName, addr: settings.companyAddr, tel: settings.companyTel };

    const recCol = await collections.recipients();
    const unsubCol = await collections.unsubscribes();
    const campCol = await collections.campaigns();

    const q = { category, sendStatus: 'ready' };
    if (Array.isArray(ids) && ids.length) {
      q._id = { $in: ids.map((id) => new ObjectId(id)) };
    }
    const targets = await recCol
      .find(q)
      .limit(Math.min(limit, 200))
      .toArray();

    if (!targets.length) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, skipped: 0 });
    }

    const campaign = await campCol.insertOne({
      category,
      subject: adSubject(tpl.subject, settings.useAdPrefix !== false),
      total: targets.length,
      sentCount: 0,
      createdAt: new Date(),
    });

    let sent = 0,
      failed = 0,
      skipped = 0;

    for (const r of targets) {
      // 수신거부 확인
      const unsub = await unsubCol.findOne({ email: r.email });
      if (unsub) {
        await recCol.updateOne({ _id: r._id }, { $set: { sendStatus: 'unsubscribed' } });
        skipped++;
        continue;
      }
      try {
        const vars = { companyName: r.companyName || '담당자' };
        const subject = adSubject(renderTemplate(tpl.subject, vars), settings.useAdPrefix !== false);
        const body = renderTemplate(tpl.bodyHtml, vars);
        const html = withComplianceFooter(logoHeader() + body, r.email, company);
        await sendMail({ to: r.email, subject, html });
        await recCol.updateOne(
          { _id: r._id },
          { $set: { sendStatus: 'sent', sentAt: new Date(), campaignId: campaign.insertedId } }
        );
        sent++;
      } catch (e) {
        await recCol.updateOne(
          { _id: r._id },
          { $set: { sendStatus: 'failed', sendError: String(e?.message || e) } }
        );
        failed++;
      }
      await sleep(300); // 발송 간격 (스팸 회피)
    }

    await campCol.updateOne({ _id: campaign.insertedId }, { $set: { sentCount: sent } });

    return NextResponse.json({ ok: true, sent, failed, skipped, campaignId: String(campaign.insertedId) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
