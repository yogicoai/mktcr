// 회사 메일 SMTP 발송 (nodemailer).
import nodemailer from 'nodemailer';

let transporter = null;

export function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER) {
    throw new Error('SMTP_HOST / SMTP_USER 미설정 — .env.local 을 확인하세요.');
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: String(SMTP_SECURE) !== 'false',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export function fromAddress() {
  const name = process.env.MAIL_FROM_NAME || '요기보 마케팅';
  const addr = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;
  return `${name} <${addr}>`;
}

/** 단일 메일 발송 */
export async function sendMail({ to, subject, html }) {
  const info = await getTransporter().sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
  });
  return info.messageId;
}
