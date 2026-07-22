import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * 관리자 2차 검증: 리드 승인/반려.
 * body: { ids: string[], action: 'approve'|'reject' }
 * approve → lead.status=approved + recipients(2차 DB) 이관
 * reject  → lead.status=rejected
 */
export async function POST(req) {
  try {
    const { ids, action } = await req.json();
    if (!Array.isArray(ids) || !ids.length) throw new Error('ids 필요');
    if (!['approve', 'reject'].includes(action)) throw new Error('action 오류');

    const leadsCol = await collections.leads();
    const recCol = await collections.recipients();
    const objIds = ids.map((id) => new ObjectId(id));
    const now = new Date();

    if (action === 'reject') {
      await leadsCol.updateMany(
        { _id: { $in: objIds } },
        { $set: { status: 'rejected', updatedAt: now } }
      );
      return NextResponse.json({ ok: true, rejected: ids.length });
    }

    // approve: 승인 표시 + recipients 이관(이메일 중복 방지)
    const leads = await leadsCol.find({ _id: { $in: objIds } }).toArray();
    let moved = 0;
    for (const l of leads) {
      const exists = await recCol.findOne({ email: l.email });
      if (!exists) {
        await recCol.insertOne({
          leadId: l._id,
          category: l.category,
          companyName: l.companyName,
          email: l.email,
          url: l.url,
          templateId: null,
          sendStatus: 'ready', // ready → sent/failed/unsubscribed
          createdAt: now,
        });
        moved++;
      }
      await leadsCol.updateOne({ _id: l._id }, { $set: { status: 'approved', updatedAt: now } });
    }

    return NextResponse.json({ ok: true, approved: leads.length, moved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
