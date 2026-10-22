// ============================================================
//  GAS 프록시 (Vercel Serverless Function)
//  브라우저 → /api/gas?t=별칭 → (서버) → 실제 GAS URL
//
//  실제 GAS 주소는 Vercel 환경변수에만 있으므로
//  브라우저 개발자도구·소스보기로 노출되지 않습니다.
//
//  필요한 환경변수
//   GAS_URLS     : 별칭 → 실제 URL 매핑 (JSON 문자열)
//   APP_PASSWORD : (선택) 설정하면 이 키를 가진 요청만 허용
// ============================================================

function loadMap() {
  try {
    return JSON.parse(process.env.GAS_URLS || '{}');
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const map = loadMap();

  // ── 접근 제한 (APP_PASSWORD가 설정된 경우에만 동작) ──
  const pw = process.env.APP_PASSWORD;
  if (pw) {
    const given = req.headers['x-app-key'] || req.query.key || '';
    if (given !== pw) {
      return res.status(401).json({ success: false, error: '접근 권한이 없습니다.' });
    }
  }

  // ── 대상 GAS 확인 ──
  const { t, key, ...params } = req.query || {};
  if (!t) {
    return res.status(400).json({ success: false, error: 't 파라미터가 필요합니다.' });
  }
  const target = map[t];
  if (!target) {
    return res.status(404).json({
      success: false,
      error: `등록되지 않은 대상입니다: ${t}`,
      hint: 'Vercel 환경변수 GAS_URLS를 확인하세요.',
    });
  }

  // ── 실제 GAS 호출 ──
  const qs = new URLSearchParams(params).toString();
  const url = target + (qs ? (target.includes('?') ? '&' : '?') + qs : '');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);

  try {
    const init = { method: req.method, redirect: 'follow', signal: ctrl.signal };

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
      init.body = body;
      init.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; // GAS 권장 방식
    }

    const r = await fetch(url, init);
    const text = await r.text();
    clearTimeout(timer);

    const ct = r.headers.get('content-type') || 'application/json; charset=utf-8';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(r.ok ? 200 : r.status).send(text);
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === 'AbortError'
      ? '구글 서버 응답 시간 초과(25초)'
      : '프록시 호출 실패: ' + err.message;
    return res.status(502).json({ success: false, error: msg });
  }
}
