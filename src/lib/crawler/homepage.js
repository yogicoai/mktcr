// 홈페이지 크롤링 — 메인 + 연락처류 서브페이지에서 이메일 추출.
import * as cheerio from 'cheerio';
import { extractEmails } from './extractEmail';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// 연락처 정보가 있을 법한 서브페이지 힌트
const CONTACT_HINTS = ['contact', 'about', 'company', '문의', '연락', '오시는', 'inquiry', 'support', 'cs'];

async function fetchHtml(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u;
  } catch {
    return null;
  }
}

function emailsFromHtml(html) {
  const $ = cheerio.load(html);
  const emails = new Set();
  // mailto: 링크 우선 (가장 신뢰도 높음)
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const addr = href.replace(/^mailto:/i, '').split('?')[0].trim();
    extractEmails(addr).forEach((e) => emails.add(e));
  });
  // 본문 텍스트에서 추출
  extractEmails($('body').text()).forEach((e) => emails.add(e));
  // 원본 HTML(스크립트 내 노출 등)에서도 보조 추출
  extractEmails(html).forEach((e) => emails.add(e));
  return { emails: [...emails], $ };
}

function findContactLinks($, baseUrl, max = 3) {
  const base = normalizeUrl(baseUrl);
  if (!base) return [];
  const out = new Set();
  $('a[href]').each((_, el) => {
    if (out.size >= max) return;
    const href = $(el).attr('href') || '';
    const text = ($(el).text() || '').toLowerCase();
    const hay = (href + ' ' + text).toLowerCase();
    if (!CONTACT_HINTS.some((h) => hay.includes(h))) return;
    try {
      const abs = new URL(href, base);
      if (abs.hostname === base.hostname && /^https?:$/.test(abs.protocol)) {
        out.add(abs.toString());
      }
    } catch {
      /* ignore */
    }
  });
  return [...out];
}

/**
 * 홈페이지에서 이메일 수집. 메인 → 연락처류 서브페이지 최대 N개.
 * @returns {Promise<{emails: string[], visited: number}>}
 */
export async function crawlHomepage(url, { maxSubpages = 2 } = {}) {
  const u = normalizeUrl(url);
  if (!u) return { emails: [], visited: 0 };

  const html = await fetchHtml(u.toString());
  if (!html) return { emails: [], visited: 0 };

  const { emails: mainEmails, $ } = emailsFromHtml(html);
  const collected = new Set(mainEmails);
  let visited = 1;

  // 메인에서 못 찾았을 때만 서브페이지 탐색(비용 절약)
  if (collected.size === 0 && maxSubpages > 0) {
    const links = findContactLinks($, u.toString(), maxSubpages);
    for (const link of links) {
      const subHtml = await fetchHtml(link);
      visited++;
      if (subHtml) {
        emailsFromHtml(subHtml).emails.forEach((e) => collected.add(e));
      }
      if (collected.size > 0) break;
    }
  }

  return { emails: [...collected], visited };
}
