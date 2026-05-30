import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { createMcpHandler } from 'agents/mcp';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { GetReadBooksError, getReadBooks } from './service/getReadBooks';
import { GetRecentCardsError, getRecentCards } from './service/getRecentCards';
import { SearchCardsError, searchCards } from './service/searchCards';
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
		const widgetResourceDomains = [
			publicBaseUrl,
			'https://readingdeck.s3.ap-northeast-2.amazonaws.com',
			'https://d30f9djudvl18y.cloudfront.net',
			'https://lh3.googleusercontent.com',
			'https://search1.kakaocdn.net',
			'https://images.unsplash.com',
		];

		registerAppResource(
			server,
			'Reading deck',
			WIDGET_URI,
			{
				description: 'UI of Reading Deck',
				_meta: {
					'openai/widgetDescription':
						'Shows ReadingDeck card search results and matching reading cards.',
					'openai/widgetPrefersBorder': true,
					'openai/widgetCSP': {
						connect_domains: [],
						resource_domains: widgetResourceDomains,
					},
					'openai/widgetDomain': publicBaseUrl,
				},
			},
			async () => {
				const html = await this.env.ASSETS.fetch(new URL('http://hello/index.html'));
				return {
					contents: [
						{
							uri: WIDGET_URI,
							text: await html.text(),
							mimeType: RESOURCE_MIME_TYPE,
							_meta: {
								'openai/widgetDescription':
									'Shows ReadingDeck card search results and matching reading cards.',
								'openai/widgetPrefersBorder': true,
								'openai/widgetCSP': {
									connect_domains: [],
									resource_domains: widgetResourceDomains,
								},
								'openai/widgetDomain': publicBaseUrl,
							},
						},
					],
				};
			}
		);

		registerAppTool(
			server,
			'get-cards-info',
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
				console.log('[readingdeck] tool:start', {
					hasInput: Boolean(input?.trim()),
					hasAccessToken: Boolean(readingdeckAccessToken),
					baseUrl: this.env.READINGDECK_API_BASE_URL,
				});

				try {
					const data = await searchCards({
						baseUrl: this.env.READINGDECK_API_BASE_URL,
						message: input ?? '',
						accessToken: readingdeckAccessToken,
					});

					console.log('[readingdeck] tool:success', {
						count: data.items.length,
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
				} catch (error) {
					if (error instanceof SearchCardsError) {
						console.error('[readingdeck] tool:searchCardsError', {
							status: error.status,
							message: error.message,
							detail: error.detail,
						});

						return {
							content: [
								{
								type: 'text',
								text: `ReadingDeck card search failed (${error.status}).`,
							},
						],
						structuredContent: {
							cards: [],
							queryLabel: input?.trim() || 'Current question',
							sourceLabel: 'Live tool output',
							error: {
								type: 'search_cards_error',
								status: error.status,
								},
							},
						};
					}

					console.error('[readingdeck] tool:unexpectedError', {
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						content: [
							{
								type: 'text',
								text: 'ReadingDeck tool failed unexpectedly.',
							},
						],
						structuredContent: {
							cards: [],
							queryLabel: input?.trim() || 'Current question',
							sourceLabel: 'Live tool output',
							error: {
								type: 'unexpected_error',
							},
						},
					};
				}
			}
		);

		registerAppTool(
			server,
			'get-recent-cards',
			{
				description: 'Get my most recently created cards.',
				inputSchema: {
					limit: z.number().int().min(1).max(20).optional(),
				},
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Loading your recent cards...',
					'openai/toolInvocation/invoked': 'Recent cards ready',
				},
				annotations: {
					openWorldHint: true,
					readOnlyHint: true,
				},
			},
			async ({ limit }) => {
				console.log('[readingdeck] recent-tool:start', {
					limit: limit ?? 10,
					hasAccessToken: Boolean(readingdeckAccessToken),
					baseUrl: this.env.READINGDECK_API_BASE_URL,
				});

				try {
					const data = await getRecentCards({
						baseUrl: this.env.READINGDECK_API_BASE_URL,
						limit: limit ?? 10,
						accessToken: readingdeckAccessToken,
					});

					console.log('[readingdeck] recent-tool:success', {
						count: data.items.length,
					});

					return {
						content: [
							{
								type: 'text',
								text: [
									`Fetched ${data.items.length} recent cards.`,
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
							queryLabel: 'Recent cards',
							sourceLabel: 'Live tool output',
						},
					};
				} catch (error) {
					if (error instanceof GetRecentCardsError) {
						console.error('[readingdeck] recent-tool:getRecentCardsError', {
							status: error.status,
							message: error.message,
							detail: error.detail,
						});

						return {
							content: [
								{
									type: 'text',
									text: `ReadingDeck recent cards lookup failed (${error.status}).`,
								},
							],
							structuredContent: {
								cards: [],
								queryLabel: 'Recent cards',
								sourceLabel: 'Live tool output',
								error: {
									type: 'get_recent_cards_error',
									status: error.status,
								},
							},
						};
					}

					console.error('[readingdeck] recent-tool:unexpectedError', {
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						content: [
							{
								type: 'text',
								text: 'ReadingDeck recent cards tool failed unexpectedly.',
							},
						],
						structuredContent: {
							cards: [],
							queryLabel: 'Recent cards',
							sourceLabel: 'Live tool output',
							error: {
								type: 'unexpected_error',
							},
						},
					};
				}
			},
		);

		registerAppTool(
			server,
			'get-read-books',
			{
				description: 'Get books in my ReadingDeck library.',
				inputSchema: {
					limit: z.number().int().min(1).max(20).optional(),
				},
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Loading your books...',
					'openai/toolInvocation/invoked': 'Books ready',
				},
				annotations: {
					openWorldHint: true,
					readOnlyHint: true,
				},
			},
			async ({ limit }) => {
				console.log('[readingdeck] books-tool:start', {
					limit: limit ?? 10,
					hasAccessToken: Boolean(readingdeckAccessToken),
					baseUrl: this.env.READINGDECK_API_BASE_URL,
				});

				try {
					const data = await getReadBooks({
						baseUrl: this.env.READINGDECK_API_BASE_URL,
						limit: limit ?? 10,
						accessToken: readingdeckAccessToken,
					});

					console.log('[readingdeck] books-tool:success', {
						count: data.items.length,
					});

					return {
						content: [
							{
								type: 'text',
								text: [
									`Fetched ${data.items.length} books from your ReadingDeck library.`,
									...data.items.map(
										(book, index) =>
											`${index + 1}. ${book.title} - ${book.author}${typeof book.cardCount === 'number' ? ` (${book.cardCount} cards)` : ''}`
									),
								].join('\n'),
							},
						],
						structuredContent: {
							books: data.items,
							queryLabel: 'My books',
							sourceLabel: 'Live tool output',
						},
					};
				} catch (error) {
					if (error instanceof GetReadBooksError) {
						console.error('[readingdeck] books-tool:getReadBooksError', {
							status: error.status,
							message: error.message,
							detail: error.detail,
						});

						return {
							content: [
								{
									type: 'text',
									text: `ReadingDeck books lookup failed (${error.status}).`,
								},
							],
							structuredContent: {
								books: [],
								queryLabel: 'My books',
								sourceLabel: 'Live tool output',
								error: {
									type: 'get_read_books_error',
									status: error.status,
								},
							},
						};
					}

					console.error('[readingdeck] books-tool:unexpectedError', {
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						content: [
							{
								type: 'text',
								text: 'ReadingDeck books tool failed unexpectedly.',
							},
						],
						structuredContent: {
							books: [],
							queryLabel: 'My books',
							sourceLabel: 'Live tool output',
							error: {
								type: 'unexpected_error',
							},
						},
					};
				}
			},
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
