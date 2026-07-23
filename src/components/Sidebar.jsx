'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { group: '대시보드', items: [{ href: '/', label: '📊 개요' }] },
  {
    group: '파이프라인',
    items: [
      { href: '/crawl', label: '🔍 크롤링 (키워드)' },
      { href: '/review', label: '🧪 1차 검토 (AI)' },
      { href: '/send', label: '✉️ 발송 리스트' },
    ],
  },
  {
    group: '설정',
    items: [
      { href: '/templates', label: '📝 메일 양식' },
      { href: '/settings', label: '⚙️ 발송 설정' },
    ],
  },
  { group: '도움말', items: [{ href: '/guide', label: '📖 이용 가이드' }] },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        요기보 마케팅
        <small>B2B 이메일 파이프라인</small>
      </div>
      <nav className="nav">
        {NAV.map((section) => (
          <div key={section.group}>
            <div className="group">{section.group}</div>
            {section.items.map((item) => {
              const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
