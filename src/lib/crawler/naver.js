// 네이버 검색 API 어댑터 — 업체 발굴(지역 검색 우선, 웹 검색 보조).
// https://developers.naver.com/docs/serviceapi/search/local/local.md

const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

function hasCreds() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

async function naverGet(path, params) {
  if (!hasCreds()) {
    throw new Error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 미설정');
  }
  const url = new URL(`https://openapi.naver.com/v1/search/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': CLIENT_ID,
      'X-Naver-Client-Secret': CLIENT_SECRET,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`네이버 API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * 지역 검색: 업체명/주소/전화/홈페이지 링크. display 최대 5, 첫 페이지만.
 * 더 많은 결과가 필요하면 지역 키워드를 조합해 여러 번 호출.
 * @returns {Array<{companyName, url, category, tel, address, source}>}
 */
export async function searchLocal(query) {
  const data = await naverGet('local.json', { query, display: 5, sort: 'random' });
  return (data.items || []).map((it) => ({
    companyName: stripTags(it.title),
    url: it.link || '',
    category: stripTags(it.category),
    tel: it.telephone || '',
    address: stripTags(it.roadAddress || it.address),
    source: 'naver_local',
  }));
}

/**
 * 웹 검색 보조: 홈페이지 링크 후보 확장. display 최대 100.
 * @returns {Array<{companyName, url, source}>}
 */
export async function searchWeb(query, display = 20) {
  const data = await naverGet('webkr.json', { query, display });
  return (data.items || []).map((it) => ({
    companyName: stripTags(it.title),
    url: it.link || '',
    description: stripTags(it.description),
    source: 'naver_web',
  }));
}

export { hasCreds as naverHasCreds };
