import { collections } from './db';
import { CATEGORIES, CATEGORY_KEYS } from './categories';

/** 최초 1회: 컬렉션이 비었으면 카테고리 기본 키워드를 시드 */
export async function seedKeywordsIfEmpty() {
  const col = await collections.keywords();
  const count = await col.countDocuments({});
  if (count > 0) return;
  const now = new Date();
  const docs = CATEGORIES.flatMap((c) =>
    c.keywords.map((kw) => ({ category: c.key, keyword: kw, createdAt: now }))
  );
  if (docs.length) await col.insertMany(docs);
}

export async function listKeywords() {
  await seedKeywordsIfEmpty();
  const col = await collections.keywords();
  const all = await col.find({}).sort({ createdAt: 1 }).toArray();
  return CATEGORY_KEYS.reduce((acc, key) => {
    acc[key] = all
      .filter((k) => k.category === key)
      .map((k) => ({ id: String(k._id), keyword: k.keyword }));
    return acc;
  }, {});
}

export async function addKeyword(category, keyword) {
  if (!CATEGORY_KEYS.includes(category)) throw new Error('알 수 없는 카테고리');
  const kw = String(keyword || '').trim();
  if (!kw) throw new Error('키워드가 비었습니다');
  const col = await collections.keywords();
  const exists = await col.findOne({ category, keyword: kw });
  if (exists) return { id: String(exists._id), keyword: kw, dup: true };
  const res = await col.insertOne({ category, keyword: kw, createdAt: new Date() });
  return { id: String(res.insertedId), keyword: kw };
}

export async function removeKeyword(id) {
  const { ObjectId } = await import('mongodb');
  const col = await collections.keywords();
  await col.deleteOne({ _id: new ObjectId(id) });
}
