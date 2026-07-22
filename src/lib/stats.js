import { collections } from './db';
import { CATEGORIES } from './categories';

/**
 * 대시보드 집계. DB 미연결 시 null 반환(화면에서 안내).
 */
export async function getDashboardStats() {
  try {
    const [leads, recipients] = await Promise.all([collections.leads(), collections.recipients()]);

    const [total, pendingReview, aiValid, approved, recTotal, sent] = await Promise.all([
      leads.countDocuments({}),
      leads.countDocuments({ status: 'pending' }),
      leads.countDocuments({ aiStatus: 'valid' }),
      leads.countDocuments({ status: 'approved' }),
      recipients.countDocuments({}),
      recipients.countDocuments({ sendStatus: 'sent' }),
    ]);

    // 카테고리별 leads 수
    const byCatAgg = await leads
      .aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
      .toArray();
    const byCat = CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      count: byCatAgg.find((r) => r._id === c.key)?.count || 0,
    }));

    return { total, pendingReview, aiValid, approved, recTotal, sent, byCat, connected: true };
  } catch (e) {
    return { connected: false, error: String(e?.message || e) };
  }
}
