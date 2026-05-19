import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { createMcpHandler } from 'agents/mcp';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { searchCards } from './service/searchCards';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const server = new McpServer({
			name: 'ReadingDeck Server',
			version: '1.0',
		});

		registerAppResource(
			server,
			'Reading deck',
			'ui://readingdeck-ui',
			{
				description: 'UI of Reading Deck',
			},
			async () => {
				const html = await env.ASSETS.fetch(new URL('http://hello/index.html'));
				return {
					contents: [
						{
							uri: 'ui://readingdeck-ui',
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
						resourceUri: 'ui://readingdeck-ui',
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
					baseUrl: env.READINGDECK_API_BASE_URL,
					message: input ?? '',
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

		return handler(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
