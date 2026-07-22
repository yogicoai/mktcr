import { collections } from '../db';
import { CATEGORIES, CATEGORY_KEYS, getCategory } from '../categories';

// 카테고리별 기본 메일 양식. {{companyName}} 치환 지원. (광고)표기·수신거부는 발송 시 자동 삽입.
function defaultTemplate(cat) {
  return {
    subject: `${cat.label} 대상 공간 제안 — 요기보 빈백`,
    bodyHtml: `<div style="font-family:'Malgun Gothic',sans-serif;font-size:14px;color:#222;line-height:1.7">
  <p>{{companyName}} 담당자님께,</p>
  <p>안녕하세요, 빈백 소파 브랜드 <strong>요기보(Yogibo)</strong>입니다.</p>
  <p>${cat.pitch}</p>
  <p>도입 사례와 견적, 조달/납품 방식은 회신 주시면 상세히 안내드리겠습니다. 감사합니다.</p>
  <p>— 요기보 마케팅팀 드림</p>
</div>`,
  };
}

/** 최초 1회: 카테고리별 기본 템플릿 시드 */
export async function seedTemplatesIfEmpty() {
  const col = await collections.templates();
  const now = new Date();
  for (const cat of CATEGORIES) {
    const exists = await col.findOne({ category: cat.key });
    if (!exists) {
      const t = defaultTemplate(cat);
      await col.insertOne({ category: cat.key, ...t, createdAt: now, updatedAt: now });
    }
  }
}

export async function listTemplates() {
  await seedTemplatesIfEmpty();
  const col = await collections.templates();
  const all = await col.find({}).toArray();
  return CATEGORY_KEYS.map((key) => {
    const t = all.find((x) => x.category === key);
    return {
      category: key,
      label: getCategory(key).label,
      subject: t?.subject || '',
      bodyHtml: t?.bodyHtml || '',
    };
  });
}

export async function getTemplate(category) {
  await seedTemplatesIfEmpty();
  const col = await collections.templates();
  return col.findOne({ category });
}

export async function updateTemplate(category, subject, bodyHtml) {
  if (!CATEGORY_KEYS.includes(category)) throw new Error('알 수 없는 카테고리');
  const col = await collections.templates();
  await col.updateOne(
    { category },
    { $set: { subject, bodyHtml, updatedAt: new Date() } },
    { upsert: true }
  );
}
