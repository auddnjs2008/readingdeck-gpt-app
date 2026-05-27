import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { createMcpHandler } from 'agents/mcp';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { searchCards } from './service/searchCards';
import OAuthProvider, { OAuthError } from '@cloudflare/workers-oauth-provider';
import handleAuthorizeGet from './lib/authorize';
import handleAuthCallback from './lib/callback';
import { WorkerEntrypoint, env } from 'cloudflare:workers';

const WIDGET_URI = 'ui://readingdeck-ui';

type ReadingDeckAuthProps = {
	readingdeckAccessToken?: string;
	readingdeckRefreshToken?: string;
	readingdeckUserId?: number;
	readingdeckUserName?: string;
	readingdeckProvider?: string;
	readingdeckAccessTokenExpiresIn?: number;
};

class PrivateHandler extends WorkerEntrypoint<Env> {
	async fetch(request: Request): Promise<Response> {
		const server = new McpServer({
			name: 'ReadingDeck Server',
			version: '1.0',
		});

		const authProps = (this.ctx.props ?? {}) as ReadingDeckAuthProps;
		const readingdeckAccessToken = authProps.readingdeckAccessToken;

		registerAppResource(
			server,
			'Reading deck',
			WIDGET_URI,
			{
				description: 'UI of Reading Deck',
			},
			async () => {
				const html = await this.env.ASSETS.fetch(new URL('http://hello/index.html'));
				return {
					contents: [
						{
							uri: WIDGET_URI,
							text: await html.text(),
							mimeType: RESOURCE_MIME_TYPE,
						},
					],
				};
			}
		);

		registerAppTool(
			server,
			'get My Cards Info',
			{
				description: 'Get my cards related to users question',
				inputSchema: {
					input: z.string().optional(),
				},
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Searching your Reading Deck...',
					'openai/toolInvocation/invoked': 'Cards ready',
				},
				annotations: {
					openWorldHint: true,
					readOnlyHint: true,
				},
			},
			async ({ input }) => {
				const data = await searchCards({
					baseUrl: this.env.READINGDECK_API_BASE_URL,
					message: input ?? '',
					accessToken: readingdeckAccessToken,
				});

				return {
					content: [
						{
							type: 'text',
							text: [
								`User question: ${input ?? ''}`,
								`Found ${data.items.length} relevant cards.`,
								...data.items.map((card, index) =>
									[
										`${index + 1}. [${card.type}] ${card.bookTitle} - ${card.author}`,
										`Thought: ${card.thought}`,
										`Quote: ${card.quote ?? 'N/A'}`,
									].join('\n')
								),
							].join('\n\n'),
						},
					],
					structuredContent: {
						cards: data.items,
					},
				};
			}
		);

		const handler = createMcpHandler(server);

		return handler(request, this.env, this.ctx);
	}
}

const publicHandler = {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname === '/authorize') {
			return handleAuthorizeGet(request, env);
		}

		if (url.pathname === '/auth/callback') {
			return handleAuthCallback(request, env);
		}
		return new Response(null, { status: 404 });
	},
} satisfies ExportedHandler<Env>;

export default new OAuthProvider({
	defaultHandler: publicHandler,
	apiHandler: PrivateHandler,
	apiRoute: ['/mcp'],
	authorizeEndpoint: '/authorize',
	clientRegistrationEndpoint: '/register',
	tokenEndpoint: '/token',
	tokenExchangeCallback: async (options) => {
		if (options.grantType === 'authorization_code') {
			const readingdeckAuthCode = options.props?.readingdeckAuthCode;
			if (!readingdeckAuthCode || typeof readingdeckAuthCode !== 'string') {
				throw new OAuthError('invalid_grant', {
					description: 'Missing ReadingDeck auth code',
				});
			}

			const response = await fetch(`${env.READINGDECK_API_BASE_URL}/auth/mcp/exchange`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({
					code: readingdeckAuthCode,
				}),
			});

			if (!response.ok) {
				throw new OAuthError('invalid_grant', {
					description: 'ReadingDeck code exchange failed',
				});
			}

			const result = (await response.json()) as {
				accessToken: string;
				refreshToken: string;
				expiresIn: number;
				user: {
					id: number;
					name: string;
					provider: string;
				};
			};
			return {
				accessTokenProps: {
					readingdeckAccessToken: result.accessToken,
					readingdeckRefreshToken: result.refreshToken,
					readingdeckUserId: result.user.id,
					readingdeckUserName: result.user.name,
					readingdeckProvider: result.user.provider,
					readingdeckAccessTokenExpiresIn: result.expiresIn,
				},
				newProps: {
					readingdeckAccessToken: result.accessToken,
					readingdeckRefreshToken: result.refreshToken,
					readingdeckUserId: result.user.id,
					readingdeckUserName: result.user.name,
					readingdeckProvider: result.user.provider,
					readingdeckAccessTokenExpiresIn: result.expiresIn,
				},
				accessTokenTTL: result.expiresIn,
			};
		}

		if (options.grantType === 'refresh_token') {
			const refreshToken = options.props?.readingdeckRefreshToken;

			if (!refreshToken || typeof refreshToken !== 'string') {
				throw new OAuthError('invalid_grant', {
					description: 'Missing ReadingDeck refresh token',
				});
			}
			const response = await fetch(`${env.READINGDECK_API_BASE_URL}/auth/mcp/refresh`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({
					refreshToken,
				}),
			});

			if (!response.ok) {
				throw new OAuthError('invalid_grant', {
					description: 'ReadingDeck token refresh failed',
				});
			}

			const result = (await response.json()) as {
				accessToken: string;
				refreshToken: string;
				expiresIn: number;
			};

			return {
				accessTokenProps: {
					...options.props,
					readingdeckAccessToken: result.accessToken,
					readingdeckRefreshToken: result.refreshToken,
					readingdeckAccessTokenExpiresIn: result.expiresIn,
				},
				newProps: {
					...options.props,
					readingdeckAccessToken: result.accessToken,
					readingdeckRefreshToken: result.refreshToken,
					readingdeckAccessTokenExpiresIn: result.expiresIn,
				},
				accessTokenTTL: result.expiresIn,
			};
		}

		return {};
	},
});
