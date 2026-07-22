/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 크롤링/노드메일러는 서버 전용 — 번들에서 제외
  serverExternalPackages: ['nodemailer', 'cheerio', 'playwright'],
};

module.exports = nextConfig;
