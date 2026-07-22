// 크롤링 오케스트레이터: 키워드 → 네이버 발굴 → 홈페이지 이메일 추출 → leads 적재.
import pLimit from 'p-limit';
import { searchLocal, searchWeb } from './naver';
import { crawlHomepage } from './homepage';
import { upsertLead } from '../leads';

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// 홈페이지가 아닐 가능성이 높은(플랫폼) 호스트 제외
const SKIP_HOSTS = [
  'blog.naver.com', 'cafe.naver.com', 'map.naver.com', 'place.naver.com',
  'instagram.com', 'facebook.com', 'youtube.com', 'blog.me',
  'booking.naver.com', 'smartstore.naver.com', 'pf.kakao.com',
];

/**
 * @param {object} opts
 * @param {string} opts.category  카테고리 key
 * @param {string} opts.keyword   검색 키워드
 * @param {string[]} [opts.regions] 지역 조합(각 지역별로 추가 검색)
 * @param {number} [opts.maxCompanies] 홈페이지 크롤 상한
 * @param {(msg:string)=>void} [opts.onProgress]
 */
export async function crawlKeyword({ category, keyword, regions = [], maxCompanies = 20, onProgress }) {
  const log = (m) => onProgress?.(m);

  // 1) 네이버로 업체 후보 발굴 (키워드 + 지역 조합)
  const queries = [keyword, ...regions.map((r) => `${r} ${keyword}`)];
  const candidatesByHost = new Map();

  for (const q of queries) {
    try {
      const local = await searchLocal(q);
      for (const c of local) {
        if (!c.url) continue;
        const host = hostOf(c.url);
        if (!host || SKIP_HOSTS.some((h) => host.endsWith(h))) continue;
        if (!candidatesByHost.has(host)) candidatesByHost.set(host, c);
      }
      log(`네이버 지역검색 "${q}" → 누적 ${candidatesByHost.size}개 후보`);
    } catch (e) {
      log(`네이버 검색 실패 "${q}": ${e.message}`);
      // creds 문제면 더 돌려도 소용없음
      if (String(e.message).includes('미설정')) throw e;
    }
  }

  const candidates = [...candidatesByHost.values()].slice(0, maxCompanies);

  // 2) 각 후보 홈페이지에서 이메일 추출 (동시성 제한)
  const limit = pLimit(5);
  let inserted = 0,
    duplicate = 0,
    noEmail = 0,
    withEmail = 0;

  await Promise.all(
    candidates.map((c) =>
      limit(async () => {
        const { emails } = await crawlHomepage(c.url);
        if (emails.length === 0) {
          noEmail++;
          return;
        }
        withEmail++;
        for (const email of emails) {
          try {
            const r = await upsertLead({
              category,
              keyword,
              companyName: c.companyName,
              url: c.url,
              source: c.source,
              tel: c.tel,
              address: c.address,
              naverCategory: c.category,
              email,
            });
            if (r === 'inserted') inserted++;
            else duplicate++;
          } catch (e) {
            log(`적재 실패 ${email}: ${e.message}`);
          }
        }
      })
    )
  );

  const summary = {
    keyword,
    category,
    candidates: candidates.length,
    withEmail,
    noEmail,
    inserted,
    duplicate,
  };
  log(`완료: 후보 ${summary.candidates} · 이메일보유 ${withEmail} · 신규 ${inserted} · 중복 ${duplicate}`);
  return summary;
}

export { searchWeb };
