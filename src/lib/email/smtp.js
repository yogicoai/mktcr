// 회사 메일 SMTP 발송 (nodemailer) — 설정은 DB(settings) 우선, env 폴백.
import nodemailer from 'nodemailer';
import { getSettings } from '../settings';

/** 단일 메일 발송 */
export async function sendMail({ to, subject, html }) {
  const s = await getSettings();
  if (!s.smtpHost || !s.smtpUser) {
    throw new Error('SMTP 설정이 없습니다. 설정 화면에서 호스트·아이디·비밀번호를 입력하세요.');
  }
  const transporter = nodemailer.createTransport({
    host: s.smtpHost,
    port: Number(s.smtpPort) || 465,
    secure: s.smtpSecure !== false,
    auth: { user: s.smtpUser, pass: s.smtpPass },
  });
  const from = `${s.mailFromName || '요기보 마케팅'} <${s.mailFromAddress || s.smtpUser}>`;
  const info = await transporter.sendMail({ from, to, subject, html });
  return info.messageId;
}
