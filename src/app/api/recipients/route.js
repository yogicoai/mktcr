import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** 관리 메모 저장. body: { id, memo } */
export async function PATCH(req) {
  try {
    const { id, memo } = await req.json();
    if (!id) throw new Error('id 필요');
    const recCol = await collections.recipients();
    await recCol.updateOne({ _id: new ObjectId(id) }, { $set: { memo: String(memo ?? ''), memoAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = {};
    const category = searchParams.get('category');
    const sendStatus = searchParams.get('sendStatus');
    const scheduled = searchParams.get('scheduled'); // 'true'=예약 리스트, 'false'=즉시 리스트
    if (category) q.category = category;
    if (sendStatus) q.sendStatus = sendStatus;
    if (scheduled === 'true') q.scheduled = true;
    else if (scheduled === 'false') q.scheduled = { $ne: true };
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 500);

    const recCol = await collections.recipients();
    const items = await recCol.find(q).sort({ createdAt: -1 }).limit(limit).toArray();

    // 상태별 카운트
    const counts = await recCol
      .aggregate([
        ...(category ? [{ $match: { category } }] : []),
        { $group: { _id: '$sendStatus', n: { $sum: 1 } } },
      ])
      .toArray();

    return NextResponse.json({
      ok: true,
      items: items.map((r) => ({ ...r, _id: String(r._id) })),
      counts: counts.reduce((a, c) => ({ ...a, [c._id]: c.n }), {}),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
