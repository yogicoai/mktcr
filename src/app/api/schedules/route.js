import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { CATEGORY_KEYS } from '@/lib/categories';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const col = await collections.schedules();
    const items = await col.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ ok: true, items: items.map((s) => ({ ...s, _id: String(s._id) })) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * 예약/주기 발송 생성.
 * body: { label, category, type:'once'|'daily'|'weekly', force?,
 *         runAtKst?('YYYY-MM-DDTHH:mm'), timeHM?('HH:mm'), weekdays?[0-6] }
 */
export async function POST(req) {
  try {
    const b = await req.json();
    if (!CATEGORY_KEYS.includes(b.category)) throw new Error('카테고리 오류');
    if (!['once', 'daily', 'weekly'].includes(b.type)) throw new Error('발송 유형 오류');
    if (b.type === 'once' && !b.runAtKst) throw new Error('예약 일시를 지정하세요');
    if ((b.type === 'daily' || b.type === 'weekly') && !b.timeHM) throw new Error('발송 시각을 지정하세요');
    if (b.type === 'weekly' && !(Array.isArray(b.weekdays) && b.weekdays.length)) throw new Error('요일을 선택하세요');

    const doc = {
      label: b.label || '',
      category: b.category,
      type: b.type,
      force: Boolean(b.force),
      ids: Array.isArray(b.ids) ? b.ids.map(String) : [], // 비우면 대기 전체, 채우면 선택 업체만
      targetCount: Array.isArray(b.ids) ? b.ids.length : 0,
      runAtKst: b.type === 'once' ? String(b.runAtKst) : null,
      timeHM: b.type !== 'once' ? String(b.timeHM) : null,
      weekdays: b.type === 'weekly' ? b.weekdays.map(Number) : [],
      enabled: true,
      done: false,
      lastRunDate: null,
      lastRunAt: null,
      lastResult: null,
      createdAt: new Date(),
    };
    const col = await collections.schedules();
    const r = await col.insertOne(doc);
    return NextResponse.json({ ok: true, id: String(r.insertedId) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}

export async function PATCH(req) {
  try {
    const { id, enabled } = await req.json();
    const col = await collections.schedules();
    await col.updateOne({ _id: new ObjectId(id) }, { $set: { enabled: Boolean(enabled) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const col = await collections.schedules();
    await col.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
