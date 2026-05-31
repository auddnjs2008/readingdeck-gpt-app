import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { createMcpHandler } from 'agents/mcp';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { CreateBookError, createBook } from './service/createBook';
import { CreateCardError, createCard } from './service/createCard';
import { GetCardsByBookError, getCardsByBook } from './service/getCardsByBook';
import { GetReadBooksError, getReadBooks } from './service/getReadBooks';
import { GetRecentCardsError, getRecentCards } from './service/getRecentCards';
import { SearchCardsError, searchCards } from './service/searchCards';
import { SearchBooksError, searchBooks } from './service/searchBooks';
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
			'search-cards',
			{
				description:
					'Use when the user asks for cards related to a question, topic, emotion, or idea across their ReadingDeck library.',
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
				description:
					'Use when the user wants to review their most recently created cards, regardless of book.',
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
				description:
					'Use when the user wants to see books already saved in their ReadingDeck library, or when they need to choose a target book before saving a card.',
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

		registerAppTool(
			server,
			'search-books',
			{
				description:
					'Use when the user mentions a book title, author, or topic and wants to find a real book before adding it to ReadingDeck.',
				inputSchema: {
					query: z.string().min(1),
					limit: z.number().int().min(1).max(20).optional(),
				},
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Searching books...',
					'openai/toolInvocation/invoked': 'Search results ready',
				},
				annotations: {
					openWorldHint: true,
					readOnlyHint: true,
				},
			},
			async ({ query, limit }) => {
				console.log('[readingdeck] search-books-tool:start', {
					query,
					limit: limit ?? 10,
					hasAccessToken: Boolean(readingdeckAccessToken),
					baseUrl: this.env.READINGDECK_API_BASE_URL,
				});

				try {
					const data = await searchBooks({
						baseUrl: this.env.READINGDECK_API_BASE_URL,
						query,
						limit: limit ?? 10,
						accessToken: readingdeckAccessToken,
					});

					console.log('[readingdeck] search-books-tool:success', {
						query,
						count: data.items.length,
					});

					return {
						content: [
							{
								type: 'text',
								text: [
									`Found ${data.items.length} books for "${query}".`,
									...data.items.map(
										(book, index) =>
											`${index + 1}. ${book.title} - ${book.author}${book.publisher ? ` (${book.publisher})` : ''}`
									),
								].join('\n'),
							},
						],
						structuredContent: {
							searchResults: data.items,
							queryLabel: query,
							sourceLabel: 'Search results',
						},
					};
				} catch (error) {
					if (error instanceof SearchBooksError) {
						console.error('[readingdeck] search-books-tool:searchBooksError', {
							status: error.status,
							message: error.message,
							detail: error.detail,
						});

						return {
							content: [
								{
									type: 'text',
									text: `책 검색에 실패했습니다. (${error.status})`,
								},
							],
							structuredContent: {
								searchResults: [],
								queryLabel: query,
								sourceLabel: 'Search results',
								error: {
									type: 'search_books_error',
									status: error.status,
								},
							},
						};
					}

					return {
						content: [
							{
								type: 'text',
								text: '책 검색 중 예상치 못한 오류가 발생했습니다.',
							},
						],
						structuredContent: {
							searchResults: [],
							queryLabel: query,
							sourceLabel: 'Search results',
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
			'get-cards-by-book',
			{
				description:
					'Use when the user wants to review cards that belong to a specific book already saved in ReadingDeck.',
				inputSchema: {
					bookId: z.number().int().min(1),
					limit: z.number().int().min(1).max(20).optional(),
				},
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Loading cards from your selected book...',
					'openai/toolInvocation/invoked': 'Book cards ready',
				},
				annotations: {
					openWorldHint: true,
					readOnlyHint: true,
				},
			},
			async ({ bookId, limit }) => {
				console.log('[readingdeck] cards-by-book-tool:start', {
					bookId,
					limit: limit ?? 10,
					hasAccessToken: Boolean(readingdeckAccessToken),
					baseUrl: this.env.READINGDECK_API_BASE_URL,
				});

				try {
					const data = await getCardsByBook({
						baseUrl: this.env.READINGDECK_API_BASE_URL,
						bookId,
						limit: limit ?? 10,
						accessToken: readingdeckAccessToken,
					});

					console.log('[readingdeck] cards-by-book-tool:success', {
						bookId,
						count: data.items.length,
					});

					return {
						content: [
							{
								type: 'text',
								text: [
									`Fetched ${data.items.length} cards from ${data.book.title}.`,
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
							queryLabel: data.book.title,
							sourceLabel: 'Live tool output',
						},
					};
				} catch (error) {
					if (error instanceof GetCardsByBookError) {
						console.error('[readingdeck] cards-by-book-tool:getCardsByBookError', {
							status: error.status,
							message: error.message,
							detail: error.detail,
						});

						return {
							content: [
								{
									type: 'text',
									text: `ReadingDeck book cards lookup failed (${error.status}).`,
								},
							],
							structuredContent: {
								cards: [],
								sourceLabel: 'Live tool output',
								error: {
									type: 'get_cards_by_book_error',
									status: error.status,
								},
							},
						};
					}

					console.error('[readingdeck] cards-by-book-tool:unexpectedError', {
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						content: [
							{
								type: 'text',
								text: 'ReadingDeck book cards tool failed unexpectedly.',
							},
						],
						structuredContent: {
							cards: [],
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
			'create-book',
			{
				description:
					'Use only after the target book has been clearly identified from search results or explicit user input. Creates a book in ReadingDeck so cards can be saved under it.',
				inputSchema: {
					title: z.string().min(1),
					author: z.string().min(1),
					publisher: z.string().min(1),
					contents: z.string().optional(),
					imageUrl: z.string().url().optional(),
					status: z.enum(['reading', 'finished', 'paused']).optional(),
					currentPage: z.number().int().min(0).optional(),
					totalPages: z.number().int().min(1).optional(),
					startedAt: z.string().datetime().optional(),
					finishedAt: z.string().datetime().optional(),
				},
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Creating your book...',
					'openai/toolInvocation/invoked': 'Book created',
				},
				annotations: {
					openWorldHint: true,
					readOnlyHint: false,
					destructiveHint: false,
				},
			},
			async (input) => {
				console.log('[readingdeck] create-book-tool:start', {
					title: input.title,
					hasAccessToken: Boolean(readingdeckAccessToken),
				});

				try {
					const book = await createBook({
						baseUrl: this.env.READINGDECK_API_BASE_URL,
						accessToken: readingdeckAccessToken,
						body: input,
					});

					return {
						content: [
							{
								type: 'text',
								text: `"${book.title}" 책을 ReadingDeck에 추가했어요.`,
							},
						],
						structuredContent: {
							books: [
								{
									bookId: book.id,
									title: book.title,
									author: book.author,
									backgroundImage: book.backgroundImage ?? null,
									progressPercent: book.progressPercent,
									status: book.status,
								},
							],
							queryLabel: 'Created book',
							sourceLabel: 'Live tool output',
						},
					};
				} catch (error) {
					if (error instanceof CreateBookError) {
						return {
							content: [
								{
									type: 'text',
									text: `책 생성에 실패했습니다. (${error.status})`,
								},
							],
							structuredContent: {
								books: [],
								sourceLabel: 'Live tool output',
								error: {
									type: 'create_book_error',
									status: error.status,
								},
							},
						};
					}

					return {
						content: [
							{
								type: 'text',
								text: '책 생성 중 예상치 못한 오류가 발생했습니다.',
							},
						],
						structuredContent: {
							books: [],
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
			'create-card',
			{
				description:
					'Use only when the destination book is already identified. ReadingDeck cards must belong to a specific book.',
				inputSchema: {
					bookId: z.number().int().min(1),
					type: z.enum(['insight', 'change', 'action', 'question']),
					thought: z.string().min(3),
					title: z.string().optional(),
					quote: z.string().optional(),
					pageStart: z.number().int().min(1).optional(),
					pageEnd: z.number().int().min(1).optional(),
				},
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Saving your card...',
					'openai/toolInvocation/invoked': 'Card saved',
				},
				annotations: {
					openWorldHint: true,
					readOnlyHint: false,
					destructiveHint: false,
				},
			},
			async (input) => {
				console.log('[readingdeck] create-card-tool:start', {
					bookId: input.bookId,
					type: input.type,
					hasAccessToken: Boolean(readingdeckAccessToken),
				});

				try {
					const { bookId, ...cardBody } = input;

					const card = await createCard({
						baseUrl: this.env.READINGDECK_API_BASE_URL,
						bookId,
						accessToken: readingdeckAccessToken,
						body: cardBody,
					});

					return {
						content: [
							{
								type: 'text',
								text: `"${card.bookTitle}"에 새 카드를 저장했어요.`,
							},
						],
						structuredContent: {
							cards: [card],
							queryLabel: card.bookTitle,
							sourceLabel: 'Live tool output',
						},
					};
				} catch (error) {
					if (error instanceof CreateCardError) {
						return {
							content: [
								{
									type: 'text',
									text: `카드 저장에 실패했습니다. (${error.status})`,
								},
							],
							structuredContent: {
								cards: [],
								sourceLabel: 'Live tool output',
								error: {
									type: 'create_card_error',
									status: error.status,
								},
							},
						};
					}

					return {
						content: [
							{
								type: 'text',
								text: '카드 저장 중 예상치 못한 오류가 발생했습니다.',
							},
						],
						structuredContent: {
							cards: [],
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
