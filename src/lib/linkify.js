// HTML 본문의 평문 URL을 클릭 가능한 <a> 링크로 변환. 이미 <a>로 감싼 URL은 건드리지 않음.
export function linkifyHtml(html) {
  if (!html) return html || '';
  return String(html)
    .split(/(<a\b[^>]*>.*?<\/a>)/gis) // <a>...</a> 구간 보존
    .map((part) =>
      /^<a\b/i.test(part)
        ? part
        : part.replace(
            /(https?:\/\/[^\s<>"']+)/g,
            '<a href="$1" style="color:#5b8cff" target="_blank" rel="noreferrer">$1</a>'
          )
    )
    .join('');
}
