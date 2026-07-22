// 홈페이지 텍스트/HTML에서 이메일 추출 + 노이즈 필터링.

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// 이미지/자산 확장자로 끝나는 오탐 (예: logo@2x.png)
const ASSET_EXT = /\.(png|jpe?g|gif|webp|svg|css|js|ico|woff2?)$/i;

// 실제 담당자 메일이 아닌 흔한 노이즈 도메인/샘플
const JUNK_DOMAINS = [
  'example.com', 'example.org', 'domain.com', 'email.com', 'test.com',
  'sentry.io', 'wixpress.com', 'wix.com', 'schema.org', 'w3.org',
  'googleapis.com', 'gstatic.com', 'cloudflare.com', 'jsdelivr.net',
  'sentry-next.wixpress.com', 'yourdomain.com', 'company.com',
];

// 흔한 자동응답/무의미 로컬파트 (원하면 유지하도록 완화 가능)
const JUNK_LOCAL = ['noreply', 'no-reply', 'donotreply'];

function isValidEmail(email) {
  const lower = email.toLowerCase();
  if (ASSET_EXT.test(lower)) return false;
  const [local, domain] = lower.split('@');
  if (!local || !domain) return false;
  if (domain.length < 4 || !domain.includes('.')) return false;
  if (JUNK_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) return false;
  if (JUNK_LOCAL.includes(local)) return false;
  // 버전 해시처럼 보이는 로컬파트(@abcdef1234) 제거
  if (/^[0-9a-f]{8,}$/.test(local)) return false;
  return true;
}

/**
 * @param {string} text HTML 또는 평문
 * @returns {string[]} 정규화·중복제거된 유효 이메일
 */
export function extractEmails(text) {
  if (!text) return [];
  // "user [at] domain [dot] com" 같은 난독화 최소 복원
  const deobf = text
    .replace(/\s*\[?\(?\s*at\s*\)?\]?\s*/gi, '@')
    .replace(/\s*\[?\(?\s*dot\s*\)?\]?\s*/gi, '.');

  const found = new Set();
  for (const raw of [text, deobf]) {
    const matches = raw.match(EMAIL_RE) || [];
    for (const m of matches) {
      const email = m.toLowerCase();
      if (isValidEmail(email)) found.add(email);
    }
  }
  return [...found];
}

export { isValidEmail };
