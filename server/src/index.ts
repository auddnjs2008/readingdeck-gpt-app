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
const MCP_PATH = '/mcp';

function getPublicBaseUrl(env: Env, fallbackOrigin: string) {
	return env.PUBLIC_BASE_URL || fallbackOrigin;
}

function getOAuthMetadata(baseUrl: string) {
	return {
		issuer: baseUrl,
		authorization_endpoint: `${baseUrl}/authorize`,
		token_endpoint: `${baseUrl}/token`,
		registration_endpoint: `${baseUrl}/register`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code', 'refresh_token'],
		token_endpoint_auth_methods_supported: ['none'],
		code_challenge_methods_supported: ['S256'],
	};
}

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
		const url = new URL(request.url);
		const publicBaseUrl = getPublicBaseUrl(this.env, url.origin);

		if (
			url.pathname === `${MCP_PATH}/.well-known/oauth-authorization-server` ||
			url.pathname === `${MCP_PATH}/.well-known/openid-configuration`
		) {
			return Response.json(getOAuthMetadata(publicBaseUrl), {
				headers: {
					'cache-control': 'no-store',
				},
			});
		}

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
		const publicBaseUrl = getPublicBaseUrl(env, url.origin);

		if (
			url.pathname === `/.well-known/oauth-authorization-server${MCP_PATH}` ||
			url.pathname === `/.well-known/openid-configuration${MCP_PATH}`
		) {
			return Response.json(getOAuthMetadata(publicBaseUrl), {
				headers: {
					'cache-control': 'no-store',
				},
			});
		}

		if (url.pathname === '/authorize') {
			return handleAuthorizeGet(request, env);
		}

		if (url.pathname === '/auth/callback') {
			return handleAuthCallback(request, env);
		}
		return new Response(null, { status: 404 });
	},
} satisfies ExportedHandler<Env>;

const oauthProvider = new OAuthProvider({
	defaultHandler: publicHandler,
	apiHandler: PrivateHandler,
	apiRoute: ['/mcp'],
	authorizeEndpoint: `${env.PUBLIC_BASE_URL}/authorize`,
	clientRegistrationEndpoint: `${env.PUBLIC_BASE_URL}/register`,
	tokenEndpoint: `${env.PUBLIC_BASE_URL}/token`,
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

export default {
	fetch(request, env, ctx) {
		const url = new URL(request.url);
		const publicBaseUrl = getPublicBaseUrl(env, url.origin);

		if (
			url.pathname === `${MCP_PATH}/.well-known/oauth-authorization-server` ||
			url.pathname === `${MCP_PATH}/.well-known/openid-configuration`
		) {
			return Response.json(getOAuthMetadata(publicBaseUrl), {
				headers: {
					'cache-control': 'no-store',
				},
			});
		}

		return oauthProvider.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
