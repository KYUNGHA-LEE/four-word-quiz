module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'POST 요청만 사용할 수 있습니다.' }));
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const inputPassword = String(body.password || '');
    const teacherPassword = process.env.TEACHER_PASSWORD;

    if (!teacherPassword) {
      res.statusCode = 500;
      res.end(JSON.stringify({
        ok: false,
        error: 'Vercel 환경변수 TEACHER_PASSWORD가 설정되지 않았습니다.'
      }));
      return;
    }

    if (inputPassword !== teacherPassword) {
      res.statusCode = 401;
      res.end(JSON.stringify({ ok: false, error: '비밀번호가 맞지 않습니다.' }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: '요청을 처리할 수 없습니다.' }));
  }
};
