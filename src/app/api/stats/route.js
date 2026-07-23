import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getDashboardStats();
  return NextResponse.json({ ok: s.connected !== false, stats: s });
}
