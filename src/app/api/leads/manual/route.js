import { NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { CATEGORY_KEYS } from '@/lib/categories';
import { ensureIndexes } from '@/lib/leads';

export const dynamic = 'force-dynamic';

/**
 * 관리자/마케터가 아는 업체 직접 추가.
 * body: { category, companyName, email, url? }
 * 리드로 삽입(이메일 중복 방지). AI검증 없이 '적합(관리자 추가)'로 두어 1차 검토에서 바로 승인 가능.
 */
export async function POST(req) {
  try {
    const { category, companyName, email, url } = await req.json();
    if (!CATEGORY_KEYS.includes(category)) throw new Error('카테고리를 선택하세요.');
    const e = String(email || '').toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('올바른 이메일을 입력하세요.');

    await ensureIndexes();
    const leads = await collections.leads();
    const now = new Date();
    const res = await leads.updateOne(
      { email: e },
      {
        $setOnInsert: {
          email: e, category, keyword: '직접추가', companyName: String(companyName || '').trim(),
          url: String(url || '').trim(), source: 'manual', tel: '', address: '', naverCategory: '',
          aiStatus: 'valid', aiScore: null, aiReason: '관리자 직접 추가', status: 'pending',
          createdAt: now, updatedAt: now,
        },
      },
      { upsert: true }
    );
    if (res.upsertedCount === 0) return NextResponse.json({ ok: false, error: '이미 등록된 이메일입니다.' }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
