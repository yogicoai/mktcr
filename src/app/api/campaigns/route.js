import { NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { categoryLabel } from '@/lib/categories';

export const dynamic = 'force-dynamic';

/** 날짜별 발송 이력. category 필터 옵션. */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const campCol = await collections.campaigns();
    const q = category ? { category } : {};
    const camps = await campCol.find(q).sort({ createdAt: -1 }).limit(200).toArray();

    // 날짜(YYYY-MM-DD, KST)별 그룹
    const groups = {};
    for (const c of camps) {
      const d = new Date(c.createdAt);
      const kst = new Date(d.getTime() + 9 * 3600 * 1000);
      const day = kst.toISOString().slice(0, 10);
      (groups[day] ||= []).push({
        _id: String(c._id),
        category: c.category,
        categoryLabel: categoryLabel(c.category),
        subject: c.subject,
        total: c.total || 0,
        sentCount: c.sentCount || 0,
        time: kst.toISOString().slice(11, 16),
      });
    }
    const days = Object.entries(groups).map(([date, items]) => ({
      date,
      items,
      total: items.reduce((a, x) => a + x.total, 0),
      sent: items.reduce((a, x) => a + x.sentCount, 0),
    }));

    return NextResponse.json({ ok: true, days });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
