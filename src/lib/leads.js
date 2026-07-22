import { collections } from './db';

let indexesReady = false;
async function ensureIndexes() {
  if (indexesReady) return;
  const leads = await collections.leads();
  // 이메일 기준 전역 중복 방지
  await leads.createIndex({ email: 1 }, { unique: true, sparse: true });
  await leads.createIndex({ category: 1, status: 1 });
  await leads.createIndex({ aiStatus: 1 });
  const recipients = await collections.recipients();
  await recipients.createIndex({ email: 1 });
  await recipients.createIndex({ category: 1, sendStatus: 1 });
  const unsub = await collections.unsubscribes();
  await unsub.createIndex({ email: 1 }, { unique: true });
  indexesReady = true;
}

/**
 * 크롤링 결과 1건을 leads(1차 DB)에 upsert. 이메일 중복이면 무시(신규만 삽입).
 * @returns {'inserted'|'duplicate'}
 */
export async function upsertLead(lead) {
  await ensureIndexes();
  const leads = await collections.leads();
  const now = new Date();
  const email = String(lead.email || '').toLowerCase().trim();
  if (!email) throw new Error('email 필수');

  const res = await leads.updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        category: lead.category,
        keyword: lead.keyword || '',
        companyName: lead.companyName || '',
        url: lead.url || '',
        source: lead.source || '',
        tel: lead.tel || '',
        address: lead.address || '',
        naverCategory: lead.naverCategory || '',
        aiStatus: 'pending',
        aiScore: null,
        aiReason: '',
        status: 'pending', // pending → approved/rejected
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
  return res.upsertedCount > 0 ? 'inserted' : 'duplicate';
}

export { ensureIndexes };
