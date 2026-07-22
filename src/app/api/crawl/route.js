import { NextResponse } from 'next/server';
import { crawlKeyword } from '@/lib/crawler';
import { naverHasCreds } from '@/lib/crawler/naver';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 크롤링은 오래 걸릴 수 있음

export async function POST(req) {
  try {
    const { category, keyword, regions = [], maxCompanies = 20 } = await req.json();
    if (!category || !keyword) throw new Error('category, keyword 필요');
    if (!naverHasCreds()) {
      throw new Error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 를 .env.local 에 설정하세요.');
    }
    const logs = [];
    const summary = await crawlKeyword({
      category,
      keyword,
      regions: Array.isArray(regions) ? regions : String(regions).split(',').map((s) => s.trim()).filter(Boolean),
      maxCompanies,
      onProgress: (m) => logs.push(m),
    });
    return NextResponse.json({ ok: true, summary, logs });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
