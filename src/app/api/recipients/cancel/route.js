import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * 발송 리스트에서 취소 → 1차 검토로 되돌리기.
 * body: { ids: string[] }  (recipient _id 배열)
 * 발송 대기(ready) 상태만 취소 가능. recipient 제거 + 원 lead.status를 pending 으로.
 */
export async function POST(req) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || !ids.length) throw new Error('ids 필요');

    const recCol = await collections.recipients();
    const leadsCol = await collections.leads();
    const objIds = ids.map((id) => new ObjectId(id));

    // 발송 대기 건만 취소
    const recs = await recCol.find({ _id: { $in: objIds }, sendStatus: 'ready' }).toArray();
    let cancelled = 0;
    const now = new Date();
    for (const r of recs) {
      // 원 lead 을 검토 대기 상태로 되돌림(1차 검토에 다시 노출)
      if (r.leadId) {
        await leadsCol.updateOne(
          { _id: r.leadId },
          { $set: { status: 'pending', updatedAt: now } }
        );
      }
      await recCol.deleteOne({ _id: r._id });
      cancelled++;
    }

    return NextResponse.json({ ok: true, cancelled });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
