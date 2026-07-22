import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: '요기보 B2B 마케팅 어드민',
  description: '키워드 크롤링 → AI 검증 → 관리자 승인 → 카테고리별 메일 발송',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="layout">
          <Sidebar />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
