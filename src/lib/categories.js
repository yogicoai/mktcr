/**
 * 요기보 B2B 타깃 5개 카테고리 정의.
 * - key: DB/코드에서 쓰는 식별자
 * - label: 화면 표기
 * - pitch: 요기보 빈백을 이 타깃에 제안할 때의 핵심 소구점 (AI 검증·메일 양식 기본값)
 * - keywords: 크롤링 시드 키워드 (관리자가 UI에서 추가/수정)
 */
export const CATEGORIES = [
  {
    key: 'public',
    label: '학교·공공기관·복지시설',
    pitch: '휴게공간·도서관·상담실·복지시설 라운지에 안전하고 편안한 좌석. 내구성·유지관리·조달 납품.',
    keywords: ['도서관 휴게공간', '학교 라운지', '복지관', '평생학습관', '청소년수련관'],
  },
  {
    key: 'company',
    label: '기업',
    pitch: '오피스 휴게실·라운지·수유실·리프레시존 조성. 임직원 복지, 브랜드 협업 커스텀 빈백.',
    keywords: ['기업 휴게실', '오피스 라운지', '사옥 리프레시존', '스타트업 오피스'],
  },
  {
    key: 'medical',
    label: '병·의원',
    pitch: '대기실·소아 진료실·요양시설 라운지 편의. 위생 관리 가능한 커버, 낙상 완화.',
    keywords: ['소아과', '요양병원', '병원 대기실', '재활병원', '한방병원'],
  },
  {
    key: 'resort',
    label: '리조트·호텔',
    pitch: '로비·키즈존·풀사이드·객실 라운지 연출. 포토존·브랜드 감성, 실내외 커버 옵션.',
    keywords: ['리조트', '호텔 키즈존', '풀빌라', '펜션', '글램핑'],
  },
  {
    key: 'sports',
    label: '스포츠시설·단체',
    pitch: '선수 라운지·회복공간·관람 라운지·클라이밍짐 매트존. 충격 완화, 대형 사이즈.',
    keywords: ['클라이밍짐', '스포츠센터', '체육관', '실내스포츠', '프로구단'],
  },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export function getCategory(key) {
  return CATEGORIES.find((c) => c.key === key) || null;
}

export function categoryLabel(key) {
  return getCategory(key)?.label || key;
}
