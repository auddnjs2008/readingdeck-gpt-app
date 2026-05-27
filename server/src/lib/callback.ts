const PENDING_AUTH_COOKIE = 'readingdeck_oauth_request';

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function getCookieValue(cookieHeader: string | null, key: string) {
	if (!cookieHeader) return null;

	for (const item of cookieHeader.split(';')) {
		const [rawKey, ...rest] = item.trim().split('=');

		if (rawKey === key) {
			return rest.join('=');
		}
	}

	return null;
}

function clearPendingAuthCookie() {
	return `${PENDING_AUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function renderErrorPage(message: string, status = 400) {
	return new Response(
		`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>ReadingDeck 연결 오류</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              padding: 24px;
              background:
                radial-gradient(circle at top, rgba(205, 164, 120, 0.12), transparent 38%),
                linear-gradient(180deg, rgba(255,252,247,0.96), rgba(248,242,234,0.92));
              color: #3f3631;
              font-family:
                "SUIT Variable", "Pretendard Variable", "Pretendard", -apple-system,
                BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif;
            }

            .panel {
              width: min(100%, 480px);
              border: 1px solid rgba(137,117,101,0.18);
              border-radius: 24px;
              background: rgba(255,255,255,0.95);
              padding: 24px;
              box-shadow: 0 16px 40px rgba(55,41,28,0.08);
            }

            h1 {
              margin: 0 0 12px;
              font-size: 24px;
            }

            p {
              margin: 0;
              color: #8f7f73;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="panel">
            <h1>ReadingDeck 연결을 완료하지 못했습니다</h1>
            <p>${escapeHtml(message)}</p>
          </div>
        </body>
      </html>
      `,
		{
			status,
			headers: {
				'content-type': 'text/html; charset=utf-8',
				'set-cookie': clearPendingAuthCookie(),
			},
		}
	);
}

export default async function handleAuthCallback(request: Request, env: Env) {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');

	if (!code) {
		return renderErrorPage('로그인 교환 코드가 없습니다.');
	}

	const cookieValue = getCookieValue(request.headers.get('cookie'), PENDING_AUTH_COOKIE);

	if (!cookieValue) {
		return renderErrorPage('원래 인증 요청 정보를 찾지 못했습니다.');
	}

	let originalAuthorizeUrl: string;

	try {
		originalAuthorizeUrl = decodeURIComponent(cookieValue);
	} catch {
		return renderErrorPage('저장된 인증 요청을 해석하지 못했습니다.');
	}

	const originalRequest = new Request(originalAuthorizeUrl, {
		method: 'GET',
	});

	let oauthReqInfo;

	try {
		oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(originalRequest);
	} catch {
		return renderErrorPage('인증 요청을 복원하지 못했습니다.');
	}

	const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
		request: oauthReqInfo,
		userId: `readingdeck-pending:${crypto.randomUUID()}`,
		scope: oauthReqInfo.scope ?? [],
		metadata: {
			provider: 'readingdeck',
		},
		props: {
			readingdeckAuthCode: code,
		},
	});

	return new Response(null, {
		status: 302,
		headers: {
			location: redirectTo,
			'set-cookie': clearPendingAuthCookie(),
		},
	});
}
