/**
 * DIAH-7M Agentic Integration v1.0
 * Claude API 연동: 서술 생성, 챗봇, 부품 발견, 대본 생성
 */
const CLAUDE_CONFIG = {
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 2000,
  baseUrl: 'https://api.anthropic.com/v1/messages',
};

const LANGUAGE_RULES = {
  allowed: ['관측된다', '비교하면', '역사적으로', '추세가 보인다', '패턴이 나타난다'],
  blocked: ['전망된다', '예상된다', '할 것이다', '목표가'],
  systemPrompt: `당신은 DIAH-7M 경제 진단 시스템입니다.
절대 규칙: 예측/전망 금지. 관찰/비교/역사만 사용.
금지어: 전망된다, 예상된다, ~할 것이다, 목표가
허용어: 관측된다, 비교하면, 역사적으로, 추세가 보인다, 패턴이 나타난다`,
};

async function callClaude(userMessage, systemOverride) {
  if (!CLAUDE_CONFIG.apiKey) return { stub: true, text: '[Claude API 미설정] ' + userMessage.slice(0, 50) };
  const https = require('https');
  const body = JSON.stringify({
    model: CLAUDE_CONFIG.model, max_tokens: CLAUDE_CONFIG.maxTokens,
    system: systemOverride || LANGUAGE_RULES.systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_CONFIG.apiKey, 'anthropic-version': '2023-06-01' },
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { const j = JSON.parse(d); resolve({ text: j.content?.[0]?.text || '' }); } catch(e) { reject(e); } }); });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function generateNarrative(diagnosisJSON) {
  return callClaude(`다음 경제 진단 결과를 한국어로 서술하세요. 관찰/비교/역사 언어만 사용:\n${JSON.stringify(diagnosisJSON).slice(0, 3000)}`);
}

async function chatResponse(userQuestion, context) {
  return callClaude(`사용자 질문: ${userQuestion}\n컨텍스트: ${JSON.stringify(context).slice(0, 1000)}`);
}

async function generateYouTubeScript(stockDiagnosis) {
  return callClaude(`다음 종목 위성 진단으로 5분 유튜브 대본을 작성하세요 (도입30초+위성2분+해석2분+결론30초):\n${JSON.stringify(stockDiagnosis).slice(0, 2000)}`);
}

function filterPredictionLanguage(text) {
  let filtered = text;
  LANGUAGE_RULES.blocked.forEach(word => { filtered = filtered.replace(new RegExp(word, 'g'), '[관측됨]'); });
  return filtered;
}

module.exports = { callClaude, generateNarrative, chatResponse, generateYouTubeScript, filterPredictionLanguage, CLAUDE_CONFIG, LANGUAGE_RULES };
