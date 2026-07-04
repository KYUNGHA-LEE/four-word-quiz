function jsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function extractTextFromGemini(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim() || '';
}

function stripJsonFence(text) {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function safeParseJson(text) {
  const cleaned = stripJsonFence(text);
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    }
    throw firstError;
  }
}

function charLength(value) {
  return Array.from(String(value || '').trim()).length;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/[\s\-_/.,!?~`'"“”‘’()\[\]{}:;·]/g, '')
    .toLowerCase();
}

function sanitizeItem(item) {
  const front = String(item.front || '').trim();
  const answer = String(item.answer || '').trim();
  const fullWord = String(item.fullWord || '').trim();
  const hint = String(item.hint || '').trim();
  const category = String(item.category || '혼합').trim();

  const rawAcceptable = Array.isArray(item.acceptableAnswers)
    ? item.acceptableAnswers
    : String(item.acceptableAnswers || '').split('|');

  const acceptableAnswers = Array.from(new Set(
    [answer, ...rawAcceptable]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  ));

  if (charLength(front) !== 2) return null;
  if (charLength(answer) !== 2) return null;
  if (fullWord && charLength(fullWord) !== 4) return null;
  if (!hint) return null;

  return {
    front,
    answer,
    acceptableAnswers,
    normalizedAnswers: acceptableAnswers.map(normalizeText),
    fullWord: fullWord || `${front}${answer}`,
    hint,
    category
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    jsonResponse(res, 405, { ok: false, error: 'POST 요청만 사용할 수 있습니다.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    jsonResponse(res, 500, {
      ok: false,
      error: 'Vercel 환경변수 GEMINI_API_KEY가 설정되지 않았습니다.'
    });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const requestedCount = Number.parseInt(body.count, 10);
    const count = Number.isFinite(requestedCount) ? Math.min(Math.max(requestedCount, 5), 50) : 20;

    const prompt = `
너는 초등 수업용 실시간 4글자 퀴즈 문제를 만드는 도우미다.

게임 규칙:
- 학생에게 앞 2글자만 보여준다.
- 학생은 뒤 2글자만 입력한다.
- 앞 2글자 + 뒤 2글자가 실제로 쓰이는 4글자 단어가 되어야 한다.

생성 조건:
- 정확히 ${count}개를 만든다.
- front는 정확히 2글자다.
- answer는 정확히 2글자다.
- fullWord는 정확히 4글자다.
- 초등학생도 이해할 수 있는 단어를 우선한다.
- 쉬운 생활 단어, 음식, 나라/장소, 외래어, 학교/수업 관련 단어, 속담/사자성어를 골고루 섞는다.
- 실제로 존재하지 않는 단어, 억지 단어, 비속어, 선정적 표현, 정치적 논란 표현은 만들지 않는다.
- front만 봤을 때 answer가 어느 정도 추측 가능해야 한다.
- 힌트는 정답을 그대로 말하지 않고 짧고 쉬운 설명으로 쓴다.
- acceptableAnswers에는 맞춤법 차이 또는 흔한 표기 차이가 있을 때만 추가한다.

출력은 JSON 배열만 한다. 설명 문장, 마크다운, 코드블록은 쓰지 않는다.
각 항목 형식:
{
  "front": "텔레",
  "answer": "비전",
  "acceptableAnswers": ["비전", "비젼"],
  "fullWord": "텔레비전",
  "hint": "방송이나 영상을 볼 때 쓰는 기기",
  "category": "외래어"
}
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await geminiRes.json().catch(() => ({}));

    if (!geminiRes.ok) {
      jsonResponse(res, 502, {
        ok: false,
        error: data?.error?.message || 'Gemini API 호출에 실패했습니다.'
      });
      return;
    }

    const text = extractTextFromGemini(data);
    const parsed = safeParseJson(text);
    const array = Array.isArray(parsed) ? parsed : parsed?.items;

    if (!Array.isArray(array)) {
      jsonResponse(res, 502, { ok: false, error: 'Gemini 응답이 배열 형식이 아닙니다.' });
      return;
    }

    const questions = array.map(sanitizeItem).filter(Boolean).slice(0, count);

    if (questions.length < Math.min(5, count)) {
      jsonResponse(res, 502, {
        ok: false,
        error: '사용 가능한 4글자 문제가 충분히 생성되지 않았습니다. 다시 시도해 주세요.'
      });
      return;
    }

    jsonResponse(res, 200, { ok: true, questions });
  } catch (error) {
    jsonResponse(res, 500, {
      ok: false,
      error: '문제 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    });
  }
};
