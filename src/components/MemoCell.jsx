'use client';
import { useState } from 'react';

const URL_RE = /https?:\/\/[^\s]+/g;

/**
 * 관리 메모 입력 셀. 편집은 input, URL이 있으면 아래에 클릭 가능한 🔗 링크 표시.
 * props: value, onSave(v), saved(bool)
 */
export default function MemoCell({ value, onSave, saved }) {
  const [v, setV] = useState(value || '');
  const urls = v.match(URL_RE) || [];

  return (
    <div>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== (value || '')) onSave(v); }}
        placeholder="메모 · https:// 주소 입력 시 링크"
        style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', fontSize: 12 }}
      />
      {urls.length > 0 && (
        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)', fontSize: 11, textDecoration: 'underline', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={u}>
              🔗 {u.replace(/^https?:\/\//, '')}
            </a>
          ))}
        </div>
      )}
      {saved && <span style={{ color: 'var(--good)', fontSize: 11, marginLeft: 4 }}>저장됨</span>}
    </div>
  );
}
