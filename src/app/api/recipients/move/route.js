import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * 발송 리스트 ↔ 예약 발송 리스트 이동.
 * body: { ids: string[], scheduled: boolean }  scheduled=true 면 예약 리스트로, false 면 발송 리스트로.
 */
export async function POST(req) {
  try {
    const { ids, scheduled } = await req.json();
    if (!Array.isArray(ids) || !ids.length) throw new Error('ids 필요');
    const recCol = await collections.recipients();
    const objIds = ids.map((id) => new ObjectId(id));
    await recCol.updateMany({ _id: { $in: objIds } }, { $set: { scheduled: Boolean(scheduled), scheduledAt: new Date() } });
    return NextResponse.json({ ok: true, moved: ids.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
