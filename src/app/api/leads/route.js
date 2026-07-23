import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** 리드 관리 메모 저장 (2차 마케터 검증 단계). body: { id, memo } */
export async function PATCH(req) {
  try {
    const { id, memo } = await req.json();
    if (!id) throw new Error('id 필요');
    const leads = await collections.leads();
    await leads.updateOne({ _id: new ObjectId(id) }, { $set: { memo: String(memo ?? ''), memoAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = {};
    for (const key of ['category', 'status', 'aiStatus']) {
      const v = searchParams.get(key);
      if (v) q[key] = v;
    }
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);
    const leads = await collections.leads();
    const items = await leads.find(q).sort({ createdAt: -1 }).limit(limit).toArray();

    // 카테고리 지정 시 검토 진행 현황 집계(필터와 무관하게 카테고리 전체 기준)
    let counts = null;
    const category = searchParams.get('category');
    if (category) {
      const [total, aiValid, aiInvalid, aiPending, reviewPending, approved, rejected] = await Promise.all([
        leads.countDocuments({ category }),
        leads.countDocuments({ category, aiStatus: 'valid' }),
        leads.countDocuments({ category, aiStatus: 'invalid' }),
        leads.countDocuments({ category, aiStatus: 'pending' }),
        leads.countDocuments({ category, aiStatus: 'valid', status: 'pending' }), // 검토 대기(적합 & 미승인)
        leads.countDocuments({ category, status: 'approved' }),
        leads.countDocuments({ category, status: 'rejected' }),
      ]);
      counts = { total, aiValid, aiInvalid, aiPending, reviewPending, approved, rejected };
    }

    return NextResponse.json({
      ok: true,
      count: items.length,
      counts,
      items: items.map((l) => ({ ...l, _id: String(l._id) })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
