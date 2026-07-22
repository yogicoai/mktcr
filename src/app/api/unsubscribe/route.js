import { collections } from '@/lib/db';
import { verifyUnsubscribe } from '@/lib/email/compliance';

export const dynamic = 'force-dynamic';

function page(title, msg) {
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title></head>
    <body style="font-family:sans-serif;max-width:520px;margin:80px auto;padding:0 20px;text-align:center;color:#222">
    <h2>${title}</h2><p style="color:#666;line-height:1.7">${msg}</p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = verifyUnsubscribe(searchParams.get('e'), searchParams.get('t'));
  if (!email) {
    return page('링크 오류', '유효하지 않은 수신거부 링크입니다.');
  }
  const unsub = await collections.unsubscribes();
  const recCol = await collections.recipients();
  await unsub.updateOne(
    { email },
    { $setOnInsert: { email, unsubscribedAt: new Date() } },
    { upsert: true }
  );
  // 아직 발송 대기 상태면 제외 처리
  await recCol.updateMany(
    { email, sendStatus: 'ready' },
    { $set: { sendStatus: 'unsubscribed' } }
  );
  return page('수신거부 완료', `${email} 주소는 앞으로 광고성 메일 수신 대상에서 제외됩니다.`);
}
