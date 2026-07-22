/**
 * 전체 카테고리의 aiStatus=pending 리드를 앱 API로 일괄 AI 검증.
 * 실행: node scripts/validateAll.js   (dev 서버가 5600에서 떠 있어야 함)
 */
const BASE = process.env.APP_BASE_URL || 'http://localhost:5600';
const CATS = ['public', 'company', 'medical', 'resort', 'sports'];

(async () => {
  for (const category of CATS) {
    let totalV = 0, totalI = 0, round = 0;
    // pending 이 소진될 때까지 100건씩 반복
    while (true) {
      const r = await fetch(`${BASE}/api/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, limit: 100 }),
      }).then((x) => x.json());
      if (!r.ok) { console.error(`[${category}] 오류: ${r.error}`); break; }
      totalV += r.valid; totalI += r.invalid; round++;
      if (r.validated === 0) break;
      process.stdout.write(`  [${category}] round ${round}: +${r.validated} (valid ${r.valid}/invalid ${r.invalid})\n`);
    }
    console.log(`✓ ${category.padEnd(8)} valid ${totalV} · invalid ${totalI}`);
  }
  console.log('\n검증 완료');
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
