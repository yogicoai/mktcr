'use client';
import { useEffect, useState, useCallback } from 'react';
import { CATEGORIES } from '@/lib/categories';

export default function CrawlPage() {
  const [cat, setCat] = useState(CATEGORIES[0].key);
  const [keywords, setKeywords] = useState({});
  const [newKw, setNewKw] = useState('');
  const [regions, setRegions] = useState('서울, 경기, 부산');
  const [maxCompanies, setMaxCompanies] = useState(20);
  const [running, setRunning] = useState(null); // 실행중 키워드
  const [result, setResult] = useState(null);
  const [leads, setLeads] = useState([]);
  const [err, setErr] = useState('');

  const loadKeywords = useCallback(async () => {
    const r = await fetch('/api/keywords').then((r) => r.json());
    if (r.ok) setKeywords(r.keywords);
    else setErr(r.error);
  }, []);

  const loadLeads = useCallback(async () => {
    const r = await fetch(`/api/leads?category=${cat}&limit=50`).then((r) => r.json());
    if (r.ok) setLeads(r.items);
  }, [cat]);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);
  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  async function addKeyword() {
    if (!newKw.trim()) return;
    const r = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat, keyword: newKw.trim() }),
    }).then((r) => r.json());
    if (r.ok) {
      setNewKw('');
      loadKeywords();
    } else setErr(r.error);
  }

  async function delKeyword(id) {
    await fetch(`/api/keywords?id=${id}`, { method: 'DELETE' });
    loadKeywords();
  }

  async function runCrawl(keyword) {
    setRunning(keyword);
    setResult(null);
    setErr('');
    try {
      const r = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, keyword, regions, maxCompanies: Number(maxCompanies) }),
      }).then((r) => r.json());
      if (r.ok) {
        setResult(r);
        loadLeads();
      } else setErr(r.error);
    } catch (e) {
      setErr(String(e));
    } finally {
      setRunning(null);
    }
  }

  const catKeywords = keywords[cat] || [];

  return (
    <div>
      <h1 className="page-title">크롤링 (키워드)</h1>
      <p className="page-sub">카테고리·키워드 관리 후 네이버 발굴 → 홈페이지에서 이메일을 수집해 1차 DB에 적재합니다.</p>

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`btn ${c.key === cat ? '' : 'secondary'}`}
            onClick={() => setCat(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {err && (
        <div className="card" style={{ borderColor: 'var(--bad)', marginBottom: 16, color: 'var(--bad)' }}>
          {err}
        </div>
      )}

      {/* 크롤 옵션 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: 1, minWidth: 240 }}>
            <div className="kpi-label" style={{ marginBottom: 6 }}>지역 조합 (쉼표 구분 — 키워드와 조합 검색)</div>
            <input value={regions} onChange={(e) => setRegions(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ width: 140 }}>
            <div className="kpi-label" style={{ marginBottom: 6 }}>홈페이지 크롤 상한</div>
            <input type="number" value={maxCompanies} onChange={(e) => setMaxCompanies(e.target.value)} style={inputStyle} />
          </label>
        </div>
      </div>

      {/* 키워드 관리 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={newKw}
            onChange={(e) => setNewKw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="새 키워드 추가"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button className="btn" onClick={addKeyword}>추가</button>
        </div>
        <table>
          <thead>
            <tr><th>키워드</th><th style={{ width: 200 }}>크롤 실행</th><th style={{ width: 60 }}></th></tr>
          </thead>
          <tbody>
            {catKeywords.map((k) => (
              <tr key={k.id}>
                <td>{k.keyword}</td>
                <td>
                  <button className="btn" disabled={!!running} onClick={() => runCrawl(k.keyword)}>
                    {running === k.keyword ? '수집 중…' : '크롤 실행'}
                  </button>
                </td>
                <td>
                  <button className="btn secondary" onClick={() => delKeyword(k.id)}>삭제</button>
                </td>
              </tr>
            ))}
            {catKeywords.length === 0 && (
              <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>키워드가 없습니다. 추가하세요.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 실행 결과 */}
      {result && (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>수집 결과</strong>
          <div className="cards" style={{ marginTop: 12 }}>
            <Mini label="후보 업체" v={result.summary.candidates} />
            <Mini label="이메일 보유" v={result.summary.withEmail} />
            <Mini label="신규 적재" v={result.summary.inserted} />
            <Mini label="중복" v={result.summary.duplicate} />
          </div>
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', color: 'var(--muted)' }}>실행 로그</summary>
            <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--muted)', fontSize: 12 }}>
              {result.logs.join('\n')}
            </pre>
          </details>
        </div>
      )}

      {/* 최근 수집 leads */}
      <h2 style={{ fontSize: 15 }}>최근 수집 ({leads.length})</h2>
      <div className="card" style={{ marginTop: 8 }}>
        <table>
          <thead>
            <tr><th>업체</th><th>이메일</th><th>키워드</th><th>AI</th><th>상태</th></tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l._id}>
                <td>{l.companyName || '-'}</td>
                <td>{l.email}</td>
                <td>{l.keyword}</td>
                <td><span className={`badge ${l.aiStatus}`}>{l.aiStatus}</span></td>
                <td><span className={`badge ${l.status}`}>{l.status}</span></td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>아직 수집된 데이터가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)',
};

function Mini({ label, v }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
