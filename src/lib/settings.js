import { getDb } from './db';

// DB에 저장된 설정이 우선, 없으면 env 기본값.
function defaults() {
  return {
    smtpHost: process.env.SMTP_HOST || 'wsmtp.ecount.com',
    smtpPort: Number(process.env.SMTP_PORT) || 465,
    smtpSecure: String(process.env.SMTP_SECURE) !== 'false',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    mailFromName: process.env.MAIL_FROM_NAME || '요기보 마케팅',
    mailFromAddress: process.env.MAIL_FROM_ADDRESS || '',
    companyName: process.env.COMPANY_NAME || '주식회사 요기보',
    companyAddr: process.env.COMPANY_ADDR || '',
    companyTel: process.env.COMPANY_TEL || '',
    useAdPrefix: true, // 제목 (광고) 표기 (정보통신망법 준수 — 기본 켜짐)
  };
}

const SETTINGS_ID = 'main';

export async function getSettings() {
  const db = await getDb();
  const doc = await db.collection('settings').findOne({ _id: SETTINGS_ID });
  const merged = { ...defaults(), ...(doc || {}) };
  delete merged._id;
  return merged;
}

/** 저장. 빈 아이디/비밀번호는 기존값 유지(덮어쓰지 않음). */
export async function saveSettings(patch) {
  const db = await getDb();
  const set = { ...patch, updatedAt: new Date() };
  if (!set.smtpPass) delete set.smtpPass; // 빈 값이면 비밀번호 유지
  if (!set.smtpUser) delete set.smtpUser; // 빈 값이면 아이디 유지
  if ('_id' in set) delete set._id;
  await db.collection('settings').updateOne(
    { _id: SETTINGS_ID },
    { $set: set },
    { upsert: true }
  );
}
