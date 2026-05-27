const PENDING_AUTH_COOKIE = 'readingdeck_oauth_request';

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export default async function handleAuthorizeGet(request: Request, env: Env) {
	const oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request);
	const client = await env.OAUTH_PROVIDER.lookupClient(oauthReqInfo.clientId);

	const appName = client?.clientName?.trim() || 'AI';

	const pendingRequest = encodeURIComponent(request.url);

	const googleHref = `${env.READINGDECK_API_BASE_URL}/auth/mcp/google`;
	const kakaoHref = `${env.READINGDECK_API_BASE_URL}/auth/mcp/kakao`;

	return new Response(
		`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ReadingDeck 연결</title>
        <style>
          :root {
            color-scheme: light dark;
            --background:
              radial-gradient(circle at top, rgba(205, 164, 120, 0.12), transparent 38%),
              linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(248, 242, 234, 0.92));
            --card: rgba(255, 255, 255, 0.95);
            --border: rgba(137, 117, 101, 0.18);
            --text: #3f3631;
            --muted: #8f7f73;
            --primary: #c15c3d;
            --shadow: 0 16px 40px rgba(55, 41, 28, 0.08);
          }

          @media (prefers-color-scheme: dark) {
            :root {
              --background:
                radial-gradient(circle at top, rgba(205, 164, 120, 0.12), transparent 28%),
                linear-gradient(180deg, rgba(22, 19, 17, 0.98), rgba(28, 24, 21, 0.96));
              --card: rgba(39, 34, 31, 0.92);
              --border: rgba(115, 97, 83, 0.36);
              --text: #f4eee8;
              --muted: #b3a195;
              --shadow: 0 16px 44px rgba(0, 0, 0, 0.28);
            }
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            color: var(--text);
            background: var(--background);
            font-family:
              "SUIT Variable", "Pretendard Variable", "Pretendard", -apple-system,
              BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif;
          }

          .shell {
            width: 100%;
            max-width: 32rem;
            min-height: 100vh;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4rem 1rem;
          }

          .stack {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }

          .brand {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
          }

          .brand-mark {
            width: 3rem;
            height: 3rem;
            border-radius: 1rem;
            display: grid;
            place-items: center;
            color: var(--primary);
            background: rgba(193, 92, 61, 0.14);
            box-shadow: 0 8px 24px rgba(193, 92, 61, 0.12);
          }

          .brand h1 {
            margin: 0;
            font-size: clamp(1.8rem, 4vw, 2.2rem);
            font-weight: 600;
            letter-spacing: -0.03em;
          }

          .brand p {
            margin: 0;
            color: var(--muted);
            font-size: 0.95rem;
            line-height: 1.65;
          }

          .panel {
            border: 1px solid var(--border);
            border-radius: 1.5rem;
            background: var(--card);
            box-shadow: var(--shadow);
            backdrop-filter: blur(14px);
            text-align: left;
          }

          .panel-inner {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding: 1.5rem;
          }

          .action {
            display: inline-flex;
            width: 100%;
            height: 3rem;
            align-items: center;
            justify-content: center;
            gap: 0.625rem;
            border-radius: 0.75rem;
            border: 1px solid transparent;
            text-decoration: none;
            font-size: 1rem;
            font-weight: 600;
            transition:
              background-color 160ms ease,
              border-color 160ms ease,
              transform 160ms ease;
          }

          .action:hover {
            transform: translateY(-1px);
          }

          .action-kakao {
            background: #fee500;
            border-color: #fee500;
            color: #191600;
          }

          .action-kakao:hover {
            background: #f2da00;
            border-color: #f2da00;
          }

          .action-google {
            background: rgba(255, 255, 255, 0.88);
            border-color: var(--border);
            color: var(--text);
          }

          @media (prefers-color-scheme: dark) {
            .action-google {
              background: rgba(30, 27, 24, 0.9);
            }
          }

          .divider {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--muted);
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
          }

          .divider::before,
          .divider::after {
            content: "";
            height: 1px;
            flex: 1;
            background: var(--border);
          }

          .hint {
            margin: 0;
            color: var(--muted);
            font-size: 0.82rem;
            line-height: 1.55;
            text-align: center;
          }

          .footnote {
            margin: 0;
            color: var(--muted);
            font-size: 0.75rem;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <main class="shell">
          <section class="stack">
            <div class="brand">
              <div class="brand-mark" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M7 5.5A2.5 2.5 0 0 1 9.5 3H18a1 1 0 1 1 0 2H9.5A.5.5 0 0 0 9 5.5v12a.5.5 0 0 0 .5.5H18a1 1 0 1 1 0 2H9.5A2.5 2.5 0 0 1 7 17.5v-12Z" fill="currentColor"/>
                  <path d="M5 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1Zm7.2 1.2a1 1 0 0 1 1.4 0l3.4 3.4a1.5 1.5 0 0 1 0 2.1l-3.4 3.4a1 1 0 1 1-1.4-1.4l2.7-2.7H8.5a1 1 0 1 1 0-2h6.4l-2.7-2.7a1 1 0 0 1 0-1.4Z" fill="currentColor"/>
                </svg>
              </div>
              <h1>ReadingDeck에 오신 것을 환영합니다</h1>
              <p>${escapeHtml(appName)}에서 ReadingDeck 계정을 연결하고 독서 기록을 이어가세요.</p>
            </div>

            <div class="panel">
              <div class="panel-inner">
                <a class="action action-kakao" href="${kakaoHref}">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path fill="currentColor" d="M12 4C7.03 4 3 7.13 3 10.99c0 2.5 1.68 4.7 4.2 5.95l-.86 3.12a.43.43 0 0 0 .65.47l3.75-2.49c.42.05.84.08 1.26.08 4.97 0 9-3.13 9-6.99C21 7.13 16.97 4 12 4Z"/>
                  </svg>
                  카카오로 시작하기
                </a>

                <a class="action action-google" href="${googleHref}">
                  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8.1 3.1l5.7-5.7C34.2 6.2 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.3 19 12 24 12c3.1 0 5.9 1.2 8.1 3.1l5.7-5.7C34.2 6.2 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.1 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.7 16.3 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.2 3.2-3.5 5.6-6.3 7.1l6.2 5.2C38.6 37.1 44 32 44 24c0-1.3-.1-2.7-.4-3.5z"/>
                  </svg>
                  Google로 시작하기
                </a>

                <div class="divider">또는</div>

                <p class="hint">
                  이 연결은 ReadingDeck 개인 카드와 독서 기록을 안전하게 불러오기 위해 필요합니다.
                </p>
              </div>
            </div>

            <p class="footnote">
              계속하면 ReadingDeck 계정 연결과 필요한 인증 처리 진행에 동의하는 것으로 간주됩니다.
            </p>
          </section>
        </main>
      </body>
    </html>
    `,
		{
			headers: {
				'content-type': 'text/html; charset=utf-8',
				'set-cookie': `${PENDING_AUTH_COOKIE}=${pendingRequest}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
			},
		}
	);
}
