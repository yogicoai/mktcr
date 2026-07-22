import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { validateLeads } from '@/lib/ai/validate';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH = 10;

/**
 * 카테고리의 aiStatus=pending 리드를 배치로 AI 1차 검증 후 결과 반영.
 * body: { category, limit?=50 }
 */
export async function POST(req) {
  try {
    const { category, limit = 50 } = await req.json();
    if (!category) throw new Error('category 필요');

    const leadsCol = await collections.leads();
    const pending = await leadsCol
      .find({ category, aiStatus: 'pending' })
      .sort({ createdAt: 1 })
      .limit(Math.min(limit, 200))
      .toArray();

    if (!pending.length) {
      return NextResponse.json({ ok: true, validated: 0, valid: 0, invalid: 0 });
    }

    const items = pending.map((l) => ({
      _id: String(l._id),
      email: l.email,
      companyName: l.companyName,
      url: l.url,
      naverCategory: l.naverCategory,
    }));

    let valid = 0,
      invalid = 0;

    // 배치 순차 처리(레이트리밋 안전)
    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);
      const verdicts = await validateLeads(category, chunk);
      for (const v of verdicts) {
        const status = v.verdict === 'valid' ? 'valid' : 'invalid';
        if (status === 'valid') valid++;
        else invalid++;
        await leadsCol.updateOne(
          { _id: new ObjectId(v._id) },
          {
            $set: {
              aiStatus: status,
              aiScore: v.score,
              aiReason: v.reason,
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    return NextResponse.json({ ok: true, validated: valid + invalid, valid, invalid });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
