// 정보통신망법(제50조) 준수 유틸 — (광고) 표기, 수신거부 링크, 야간 발송 차단.
import crypto from 'crypto';

const SECRET = process.env.UNSUB_SECRET || 'dev-unsub-secret';
const BASE = process.env.APP_BASE_URL || 'http://localhost:5600';

const COMPANY = {
  name: process.env.COMPANY_NAME || '주식회사 요기보',
  addr: process.env.COMPANY_ADDR || '',
  tel: process.env.COMPANY_TEL || '',
};

function b64url(s) {
  return Buffer.from(s).toString('base64url');
}
function sign(email) {
  return crypto.createHmac('sha256', SECRET).update(email.toLowerCase()).digest('base64url');
}

/** 수신거부 링크 생성 (이메일 + HMAC 서명) */
export function unsubscribeUrl(email) {
  const e = b64url(email.toLowerCase());
  const t = sign(email);
  return `${BASE}/api/unsubscribe?e=${e}&t=${t}`;
}

/** 수신거부 토큰 검증 → 유효하면 이메일 반환, 아니면 null */
export function verifyUnsubscribe(e, t) {
  try {
    const email = Buffer.from(String(e), 'base64url').toString('utf8').toLowerCase();
    const expected = sign(email);
    // 타이밍 안전 비교
    const a = Buffer.from(String(t));
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return email;
    return null;
  } catch {
    return null;
  }
}

// 모든 메일 상단 필수 로고
export const LOGO_URL = 'https://yogibo.openhost.cafe24.com/web/img/icon/logo3_on.png';
export function logoHeader() {
  return `<div style="text-align:left;padding:8px 0 16px;margin-bottom:16px;border-bottom:1px solid #eee">
  <img src="${LOGO_URL}" alt="요기보 Yogibo" style="max-width:170px;height:auto;display:inline-block" />
</div>`;
}

/** 제목에 (광고) 표기 (중복 방지). useAd=false 면 표기하지 않음. */
export function adSubject(subject, useAd = true) {
  const s = String(subject || '').trim();
  if (!useAd) return s;
  return s.startsWith('(광고)') ? s : `(광고) ${s}`;
}

/** 본문 하단에 발신자 정보 + 수신거부 안내 자동 삽입 (company 미지정 시 env 기본값) */
export function withComplianceFooter(bodyHtml, email, company = COMPANY) {
  const unsub = unsubscribeUrl(email);
  const lines = [company.name, company.addr, company.tel].filter(Boolean).join(' · ');
  const footer = `
<hr style="margin:32px 0 16px;border:none;border-top:1px solid #e5e5e5" />
<div style="font-size:12px;color:#888;line-height:1.6">
  <p>본 메일은 정보통신망법에 따른 <strong>광고성 정보</strong>이며, 귀사의 이메일 주소가 인터넷상에 공개되어 있어 발송되었습니다.</p>
  <p>${lines}</p>
  <p>더 이상 메일 수신을 원치 않으시면 <a href="${unsub}" style="color:#5b8cff">여기를 눌러 수신거부</a> 하실 수 있습니다.</p>
</div>`;
  return `${bodyHtml}${footer}`;
}

/**
 * 야간(21:00~08:00 KST) 발송 차단 여부. 광고성 정보 야간 전송 제한.
 * @param {Date} [now]
 * @returns {{blocked:boolean, kstHour:number}}
 */
export function isNightBlocked(now = new Date()) {
  const kstHour = (now.getUTCHours() + 9) % 24;
  const blocked = kstHour >= 21 || kstHour < 8;
  return { blocked, kstHour };
}

/** {{companyName}} 등 치환 */
export function renderTemplate(str, vars) {
  return String(str || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');
}
