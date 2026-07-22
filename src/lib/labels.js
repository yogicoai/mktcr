// 상태값 한글 라벨 (배지 표시용). CSS 색상 클래스는 원래 영문 값 그대로 사용.

// AI 검증 상태
export const AI_LABELS = {
  pending: '검증 대기',
  valid: '적합',
  invalid: '부적합',
};

// 관리자 검토 상태
export const STATUS_LABELS = {
  pending: '검토 대기',
  approved: '승인',
  rejected: '반려',
};

// 발송 상태
export const SEND_LABELS = {
  ready: '발송 대기',
  sent: '발송 완료',
  failed: '실패',
  unsubscribed: '수신거부',
};

export const aiLabel = (v) => AI_LABELS[v] || v || '-';
export const statusLabel = (v) => STATUS_LABELS[v] || v || '-';
export const sendLabel = (v) => SEND_LABELS[v] || v || '-';
