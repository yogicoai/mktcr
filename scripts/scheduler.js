/**
 * 예약/주기 발송 스케줄러 (백그라운드 워커).
 * 30초마다 schedules 를 확인해 KST 기준으로 도래한 발송을 /api/send 로 실행.
 * 실행: node scripts/scheduler.js  (dev/prod 서버가 떠 있어야 함)
 */
const fs = require('fs');
const p = require('path');
const { MongoClient } = require('mongodb');

const envPath = p.join(__dirname, '..', '.env.local');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const E = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || process.env[k] || '';
const APP = E('APP_BASE_URL') || 'http://localhost:5600';
const POLL_MS = 30000;

// 현재 KST 시각 파트 (UTC+9)
function kstParts() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const iso = d.toISOString();
  return { date: iso.slice(0, 10), hm: iso.slice(11, 16), dow: d.getUTCDay(), stamp: iso.slice(0, 16) };
}

function isDue(s, k) {
  if (s.type === 'once') return k.stamp >= s.runAtKst;
  if (s.type === 'daily') return s.lastRunDate !== k.date && k.hm >= s.timeHM;
  if (s.type === 'weekly') return (s.weekdays || []).includes(k.dow) && s.lastRunDate !== k.date && k.hm >= s.timeHM;
  return false;
}

async function tick(col) {
  const k = kstParts();
  const list = await col.find({ enabled: true, done: false }).toArray();
  for (const s of list) {
    if (!isDue(s, k)) continue;
    try {
      const r = await fetch(APP + '/api/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: s.category, force: s.force, limit: 200, ids: s.ids || [] }),
      }).then((x) => x.json());
      const upd = { lastRunAt: new Date(), lastResult: r };
      if (s.type === 'once') { upd.done = true; upd.enabled = false; }
      else { upd.lastRunDate = k.date; }
      await col.updateOne({ _id: s._id }, { $set: upd });
      console.log(`[${k.stamp}] 발송 "${s.label || s.category}" (${s.type}) →`,
        r.ok ? `성공 ${r.sent} · 실패 ${r.failed} · 건너뜀 ${r.skipped}` : `오류: ${r.error}`);
    } catch (e) {
      console.error(`[${k.stamp}] 발송 실패 ${s._id}:`, e.message);
    }
  }
}

(async () => {
  if (!E('MONGODB_URI')) { console.error('MONGODB_URI 미설정'); process.exit(1); }
  const client = await new MongoClient(E('MONGODB_URI')).connect();
  const col = client.db(E('MONGODB_DB') || 'mktcl').collection('schedules');
  console.log(`스케줄러 시작 — ${POLL_MS / 1000}초 간격, 대상 ${APP}`);
  const run = () => tick(col).catch((e) => console.error('tick 오류:', e.message));
  await run();
  setInterval(run, POLL_MS);
})();
