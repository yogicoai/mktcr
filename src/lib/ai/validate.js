// AI 1차 검증 — Claude로 leads의 타깃 적합성·이메일 유효성을 배치 판정.
import Anthropic from '@anthropic-ai/sdk';
import { getCategory } from '../categories';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 미설정 — .env.local 에 설정하세요.');
  }
  return new Anthropic();
}

// 구조화 출력 스키마 (제약 최소 — 값 범위는 프롬프트로 지시)
const SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          verdict: { type: 'string', enum: ['valid', 'invalid'] },
          score: { type: 'integer' },
          reason: { type: 'string' },
        },
        required: ['index', 'verdict', 'score', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
};

function buildPrompt(category, leads) {
  const cat = getCategory(category);
  const catInfo = cat
    ? `카테고리: ${cat.label}\n요기보(빈백) 소구점: ${cat.pitch}`
    : `카테고리: ${category}`;

  const rows = leads
    .map(
      (l, i) =>
        `#${i} | 업체:${l.companyName || '-'} | 이메일:${l.email} | 홈페이지:${l.url || '-'} | 네이버분류:${l.naverCategory || '-'}`
    )
    .join('\n');

  return `당신은 B2B 이메일 마케팅 리드 검증 담당자입니다. 우리 회사는 **요기보(Yogibo)** — 빈백(bean bag) 소파 제조사이며, 아래 타깃 카테고리에 맞는 업체에 B2B 제안 메일을 보냅니다.

${catInfo}

아래 크롤링된 리드 각각을 검증하세요. 각 리드에 대해:
- verdict: 이 이메일로 요기보 B2B 제안을 보낼 가치가 있으면 "valid", 아니면 "invalid"
- score: 0~100 정수 (아래 축을 종합한 신뢰도)
- reason: 한 문장 판정 근거(한국어)

**score 핵심 축은 "규모(B2B 대량납품 적합성)"입니다.** 요기보는 빈백을 대량 납품하므로, 규모 있는 조직만 가치가 있습니다.
- 높은 score(valid): 호텔·리조트 체인, 워터파크, 대형 키즈시설, 대기업·기업 사옥, 대학병원·대형 요양시설, 프로구단·대형 스포츠콤플렉스, 학교·공공기관·복지시설(조달 규모).
- 낮은 score/invalid: 개인 운영 펜션·소형 글램핑장·1~2실 풀빌라 등 소규모 사업장은 B2B 물량이 안 나오므로 제외.

이메일 적합성도 반영:
- partnership/제휴/marketing/대표 부서 이메일 = 가점, 예약(reservation)·개인 직원 이메일만 있으면 감점.
- 명백히 무관한 업종(개인 블로그, 쇼핑몰 상품문의)이면 invalid.
- 이메일 형식이 깨졌거나 테스트/샘플이면 invalid.

리드 목록:
${rows}

각 리드의 index 는 위 #번호와 일치시켜 결과를 반환하세요.`;
}

/**
 * 리드 배열을 배치로 AI 검증. 각 리드에 {aiStatus, aiScore, aiReason} 판정 부여.
 * @param {string} category
 * @param {Array<{_id, email, companyName, url, naverCategory}>} leads
 * @returns {Promise<Array<{_id, verdict, score, reason}>>}
 */
export async function validateLeads(category, leads) {
  if (!leads.length) return [];
  const anthropic = client();

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: buildPrompt(category, leads) }],
  });

  // 구조화 출력: text 블록에 JSON 문자열
  const textBlock = res.content.find((b) => b.type === 'text');
  let parsed;
  try {
    parsed = JSON.parse(textBlock?.text || '{"results":[]}');
  } catch {
    throw new Error('AI 응답 파싱 실패');
  }

  return (parsed.results || [])
    .filter((r) => r.index >= 0 && r.index < leads.length)
    .map((r) => ({
      _id: leads[r.index]._id,
      verdict: r.verdict,
      score: r.score,
      reason: r.reason,
    }));
}

export { MODEL as AI_MODEL };
