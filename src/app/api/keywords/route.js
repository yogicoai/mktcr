import { NextResponse } from 'next/server';
import { listKeywords, addKeyword, removeKeyword } from '@/lib/keywords';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ ok: true, keywords: await listKeywords() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { category, keyword } = await req.json();
    const added = await addKeyword(category, keyword);
    return NextResponse.json({ ok: true, added });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('id 필요');
    await removeKeyword(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
