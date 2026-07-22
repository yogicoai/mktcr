import { NextResponse } from 'next/server';
import { listTemplates, updateTemplate } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ ok: true, templates: await listTemplates() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { category, subject, bodyHtml } = await req.json();
    await updateTemplate(category, subject, bodyHtml);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
