import { NextResponse } from 'next/server';
import { collections } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    return NextResponse.json({
      ok: true,
      count: items.length,
      items: items.map((l) => ({ ...l, _id: String(l._id) })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
