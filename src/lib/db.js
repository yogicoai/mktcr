import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'mktcl';

if (!uri) {
  // 빌드 시점엔 없을 수 있으므로 런타임 접근 시 던짐
  console.warn('[db] MONGODB_URI 미설정 — DB 접근 시 실패합니다.');
}

// Next dev 핫리로드에서 커넥션 누수 방지: 전역 캐시
let cached = global._mktclMongo;
if (!cached) {
  cached = global._mktclMongo = { client: null, promise: null };
}

async function getClient() {
  if (cached.client) return cached.client;
  if (!cached.promise) {
    cached.promise = new MongoClient(uri, { maxPoolSize: 10 }).connect();
  }
  cached.client = await cached.promise;
  return cached.client;
}

export async function getDb() {
  const client = await getClient();
  return client.db(dbName);
}

/** 컬렉션 헬퍼 */
export const collections = {
  leads: () => getDb().then((db) => db.collection('leads')),
  recipients: () => getDb().then((db) => db.collection('recipients')),
  templates: () => getDb().then((db) => db.collection('templates')),
  campaigns: () => getDb().then((db) => db.collection('campaigns')),
  unsubscribes: () => getDb().then((db) => db.collection('unsubscribes')),
  keywords: () => getDb().then((db) => db.collection('keywords')),
  schedules: () => getDb().then((db) => db.collection('schedules')),
};
