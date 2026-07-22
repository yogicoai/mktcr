// 홈페이지 크롤링 — Playwright 헤드리스로 SPA 렌더 후 이메일 추출.
// 메인 렌더 → mailto·본문·HTML에서 추출 → 없으면 연락처/개인정보류 서브페이지 순회.
import { getBrowser } from './browser';
import { extractEmails } from './extractEmail';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// 연락처/기관정보가 있을 법한 서브페이지 힌트
const CONTACT_HINTS = [
  'contact', 'about', 'company', 'privacy', 'introduction', 'intro', 'org',
  '문의', '연락', '오시', '개인정보', '기관', '소개', '이용약관', 'sitemap',
];

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u;
  } catch {
    return null;
  }
}

// 렌더된 페이지에서 이메일 + 후보 서브링크 수집
async function scrapePage(page) {
  return page.evaluate(() => {
    const emails = new Set();
    // mailto 링크 (신뢰도 최상)
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      const addr = (a.getAttribute('href') || '').replace(/^mailto:/i, '').split('?')[0].trim();
      if (addr) emails.add(addr);
    });
    const bodyText = document.body ? document.body.innerText : '';
    const html = document.documentElement ? document.documentElement.outerHTML : '';
    // 서브페이지 후보 링크 (같은 호스트)
    const links = [];
    document.querySelectorAll('a[href]').forEach((a) => {
      links.push({ href: a.href, text: (a.textContent || '').trim().slice(0, 40) });
    });
    return { mailto: [...emails], bodyText, html, links };
  });
}

async function loadAndScrape(context, url, timeoutMs = 15000) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    // JS 렌더 여유
    await page.waitForTimeout(1200);
    const data = await scrapePage(page);
    return data;
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

function pickContactLinks(links, baseUrl, max = 3) {
  const base = normalizeUrl(baseUrl);
  if (!base) return [];
  const out = new Set();
  for (const { href, text } of links) {
    if (out.size >= max) break;
    const hay = ((href || '') + ' ' + (text || '')).toLowerCase();
    if (!CONTACT_HINTS.some((h) => hay.includes(h))) continue;
    const u = normalizeUrl(href);
    if (u && u.hostname === base.hostname) out.add(u.toString());
  }
  return [...out];
}

function collectEmails(data) {
  const found = new Set();
  (data.mailto || []).forEach((e) => extractEmails(e).forEach((x) => found.add(x)));
  extractEmails(data.bodyText || '').forEach((e) => found.add(e));
  extractEmails(data.html || '').forEach((e) => found.add(e));
  return [...found];
}

/**
 * 홈페이지에서 이메일 수집(SPA 대응). 메인 → 없으면 연락처류 서브페이지 최대 N개.
 * @returns {Promise<{emails: string[], visited: number}>}
 */
export async function crawlHomepage(url, { maxSubpages = 3 } = {}) {
  const u = normalizeUrl(url);
  if (!u) return { emails: [], visited: 0 };

  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: UA, ignoreHTTPSErrors: true });
  let visited = 0;
  try {
    const main = await loadAndScrape(context, u.toString());
    if (!main) return { emails: [], visited: 0 };
    visited = 1;

    const emails = new Set(collectEmails(main));

    if (emails.size === 0 && maxSubpages > 0) {
      const links = pickContactLinks(main.links || [], u.toString(), maxSubpages);
      for (const link of links) {
        const sub = await loadAndScrape(context, link);
        visited++;
        if (sub) collectEmails(sub).forEach((e) => emails.add(e));
        if (emails.size > 0) break;
      }
    }
    return { emails: [...emails], visited };
  } finally {
    await context.close().catch(() => {});
  }
}
