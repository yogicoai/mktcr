/**
 * 현재 leads 전체를 CSV로 내보내고 카테고리별 요약을 출력.
 * 실행: node scripts/exportLeads.js
 * 산출물: data/leads_YYYYMMDD.csv (엑셀에서 열기), 콘솔에 요약
 */
const fs = require('fs');
const p = require('path');
const { MongoClient } = require('mongodb');

const envPath = p.join(__dirname, '..', '.env.local');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const E = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || process.env[k] || '';

const CAT_LABEL = { public: '학교·공공·복지', company: '기업', medical: '병·의원', resort: '리조트·호텔', sports: '스포츠' };
const AI_LABEL = { pending: '검증대기', valid: '적합', invalid: '부적합' };

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

(async () => {
  const client = await new MongoClient(E('MONGODB_URI')).connect();
  const col = client.db(E('MONGODB_DB') || 'mktcl').collection('leads');
  const leads = await col.find({}).sort({ category: 1, aiScore: -1 }).toArray();

  // CSV
  const header = ['카테고리', '업체명', '이메일', '홈페이지', '키워드', 'AI판정', 'AI점수', 'AI근거', '검토상태'];
  const rows = leads.map((l) => [
    CAT_LABEL[l.category] || l.category, l.companyName, l.email, l.url, l.keyword,
    AI_LABEL[l.aiStatus] || l.aiStatus, l.aiScore ?? '', l.aiReason, l.status,
  ].map(csvCell).join(','));
  const csv = '﻿' + [header.join(','), ...rows].join('\r\n'); // BOM=엑셀 한글깨짐 방지

  const dir = p.join(__dirname, '..', 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const out = p.join(dir, 'leads_export.csv');
  fs.writeFileSync(out, csv, 'utf8');

  // 요약
  const g = {};
  for (const l of leads) {
    const c = l.category;
    g[c] = g[c] || { t: 0, v: 0, i: 0, pnd: 0 };
    g[c].t++;
    g[c][l.aiStatus === 'valid' ? 'v' : l.aiStatus === 'invalid' ? 'i' : 'pnd']++;
  }
  console.log(`총 ${leads.length}건 → ${out}\n`);
  console.log('카테고리        총   적합  부적합  대기');
  for (const [k, lb] of Object.entries(CAT_LABEL)) {
    const s = g[k] || { t: 0, v: 0, i: 0, pnd: 0 };
    console.log(lb.padEnd(14), String(s.t).padStart(4), String(s.v).padStart(5), String(s.i).padStart(6), String(s.pnd).padStart(5));
  }
  await client.close();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
