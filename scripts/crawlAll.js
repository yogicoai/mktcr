/**
 * 전국 자동 크롤러 — 카테고리 키워드 × 전국 시·도를 자동 반복.
 * 네이버 지역검색으로 업체 발굴 → Playwright로 홈페이지 이메일 추출 → Mongo leads 적재.
 *
 * 실행: node scripts/crawlAll.js [category]
 *   category 생략 시 전체(public,company,medical,resort,sports)
 * 필요 env(.env.local): NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, MONGODB_URI
 */
const fs = require('fs');
const p = require('path');
const { chromium } = require('playwright');
const { MongoClient } = require('mongodb');

// ── env 로드 (.env.local) ──
const envPath = p.join(__dirname, '..', '.env.local');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const E = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || process.env[k] || '';
const NID = E('NAVER_CLIENT_ID'), NSEC = E('NAVER_CLIENT_SECRET');
const URI = E('MONGODB_URI'), DB = E('MONGODB_DB') || 'mktcl';

// ── 전국 시·도 ──
const REGIONS = ['', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

// ── 카테고리별 키워드 ──
const KEYWORDS = {
  public: ['종합사회복지관', '노인복지관', '청소년수련관', '장애인복지관', '공공도서관', '평생학습관'],
  company: ['제약회사', '화장품회사', '게임회사', '식품회사', '가구회사'],
  medical: ['종합병원', '요양병원', '재활병원', '한방병원', '병원'],
  resort: ['호텔', '리조트', '관광호텔', '콘도', '워터파크'],
  sports: ['스포츠센터', '클라이밍짐', '실내체육관', '스포츠클럽'],
};

const SKIP_HOSTS = ['blog.naver.com','cafe.naver.com','map.naver.com','place.naver.com','booking.naver.com',
  'smartstore.naver.com','instagram.com','facebook.com','youtube.com','youtu.be','blog.me','pf.kakao.com',
  'band.us','tistory.com','modoo.at','gamejob.co.kr','creatorlink.net'];

// ── 이메일 추출 유틸 ──
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const ASSET = /\.(png|jpe?g|gif|webp|svg|css|js|ico|woff2?)$/i;
const JUNK = ['example.com','sentry.io','wixpress.com','wix.com','schema.org','w3.org','googleapis.com','gstatic.com','cloudflare.com','jsdelivr.net'];
function validEmail(e){const l=e.toLowerCase();if(ASSET.test(l))return false;const[a,d]=l.split('@');if(!a||!d||!d.includes('.'))return false;if(JUNK.some(j=>d===j||d.endsWith('.'+j)))return false;if(['noreply','no-reply','donotreply'].includes(a))return false;if(/^[0-9a-f]{8,}$/.test(a))return false;return true;}
function extract(t){const s=new Set();(t.match(EMAIL_RE)||[]).forEach(m=>{const e=m.toLowerCase();if(validEmail(e))s.add(e);});return[...s];}
const HINTS = ['contact','about','company','privacy','문의','연락','오시','개인정보','기관','소개','이용약관','제휴','ir'];
const stripTags = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 네이버 지역검색 ──
async function naverLocal(query) {
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '5');
  url.searchParams.set('sort', 'random');
  const res = await fetch(url, { headers: { 'X-Naver-Client-Id': NID, 'X-Naver-Client-Secret': NSEC } });
  if (!res.ok) throw new Error(`Naver ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  return (data.items || []).map((it) => ({
    companyName: stripTags(it.title), url: it.link || '', naverCategory: stripTags(it.category),
    tel: it.telephone || '', address: stripTags(it.roadAddress || it.address),
  }));
}

// ── Playwright 이메일 추출 ──
async function scrape(page){return page.evaluate(()=>{const em=new Set();document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{const x=(a.getAttribute('href')||'').replace(/^mailto:/i,'').split('?')[0].trim();if(x)em.add(x);});const links=[];document.querySelectorAll('a[href]').forEach(a=>links.push({href:a.href,text:(a.textContent||'').trim()}));return {mailto:[...em],text:document.body?document.body.innerText:'',html:document.documentElement?document.documentElement.outerHTML:'',links};});}
async function load(ctx,url){const pg=await ctx.newPage();try{await pg.goto(url,{waitUntil:'domcontentloaded',timeout:12000});await pg.waitForTimeout(1200);return await scrape(pg);}catch{return null;}finally{await pg.close().catch(()=>{});}}
function collect(d){const s=new Set();(d.mailto||[]).forEach(e=>extract(e).forEach(x=>s.add(x)));extract(d.text||'').forEach(e=>s.add(e));extract(d.html||'').forEach(e=>s.add(e));return[...s];}
async function crawlHome(browser, cand){
  const ctx=await browser.newContext({ignoreHTTPSErrors:true});
  try{
    const main=await load(ctx,cand.url); if(!main) return [];
    let emails=collect(main);
    if(emails.length===0){
      const h=hostOf(cand.url); const subs=[];
      for(const {href,text} of (main.links||[])){if(subs.length>=2)break;const hay=(href+' '+text).toLowerCase();if(!HINTS.some(x=>hay.includes(x)))continue;try{const u=new URL(href);if(u.hostname.replace(/^www\./,'')===h)subs.push(u.toString());}catch{}}
      for(const s of subs){const sd=await load(ctx,s);if(sd){const e=collect(sd);if(e.length){emails=e;break;}}}
    }
    return emails;
  }finally{await ctx.close().catch(()=>{});}
}
async function pool(items, size, fn){let i=0;const out=[];const w=Array.from({length:size},async()=>{while(i<items.length){const idx=i++;out[idx]=await fn(items[idx]);}});await Promise.all(w);return out;}

(async () => {
  if (!NID || !NSEC) { console.error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 미설정 (.env.local)'); process.exit(1); }
  if (!URI) { console.error('MONGODB_URI 미설정'); process.exit(1); }
  const only = process.argv[2];
  const cats = only ? [only] : Object.keys(KEYWORDS);

  const client = await new MongoClient(URI).connect();
  const col = client.db(DB).collection('leads');
  await col.createIndex({ email: 1 }, { unique: true, sparse: true });

  // 1) 네이버로 전국 발굴
  const candidates = []; const seenHost = new Set();
  for (const cat of cats) {
    for (const kw of (KEYWORDS[cat] || [])) {
      for (const region of REGIONS) {
        const q = (region ? region + ' ' : '') + kw;
        try {
          const items = await naverLocal(q);
          for (const it of items) {
            const host = hostOf(it.url);
            if (!host || SKIP_HOSTS.some((s) => host.endsWith(s)) || seenHost.has(host)) continue;
            seenHost.add(host);
            candidates.push({ ...it, category: cat, keyword: kw });
          }
        } catch (e) {
          console.warn(`  [발굴실패] ${q}: ${e.message}`);
          if (String(e.message).includes('401') || String(e.message).includes('403')) { console.error('네이버 인증 실패 — 키 확인'); process.exit(1); }
        }
        await sleep(80);
      }
      process.stdout.write(`발굴 ${cat}/${kw} → 누적 후보 ${candidates.length}\n`);
    }
  }
  console.log(`\n총 발굴 후보(중복호스트 제거): ${candidates.length}\n크롤링 시작...\n`);

  // 2) Playwright 이메일 추출 + 적재
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const now = new Date();
  const stat = {}; let done = 0;
  const emailsList = await pool(candidates, 6, async (c) => {
    const emails = await crawlHome(browser, c);
    done++;
    if (done % 20 === 0) process.stdout.write(`  ...${done}/${candidates.length}\n`);
    return { c, emails };
  });
  await browser.close();

  for (const { c, emails } of emailsList) {
    stat[c.category] = stat[c.category] || { firms: 0, withEmail: 0, inserted: 0 };
    stat[c.category].firms++;
    if (emails.length) stat[c.category].withEmail++;
    for (const email of emails) {
      const r = await col.updateOne({ email: email.toLowerCase() }, { $setOnInsert: {
        email: email.toLowerCase(), category: c.category, keyword: c.keyword, companyName: c.companyName,
        url: c.url, source: 'crawlAll', tel: c.tel, address: c.address, naverCategory: c.naverCategory,
        aiStatus: 'pending', aiScore: null, aiReason: '', status: 'pending', createdAt: now, updatedAt: now,
      } }, { upsert: true });
      if (r.upsertedCount) stat[c.category].inserted++;
    }
  }

  console.log('\n=== 완료 ===');
  for (const [k, s] of Object.entries(stat)) console.log(k.padEnd(8), `업체 ${s.firms} · 이메일보유 ${s.withEmail} · 신규적재 ${s.inserted}`);
  await client.close();
})().catch((e) => { console.error('ERROR:', e); process.exit(1); });
