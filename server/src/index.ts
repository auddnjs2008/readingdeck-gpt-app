import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { createMcpHandler } from 'agents/mcp';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const server = new McpServer({
			name: 'Stocks Server',
			version: '1.0',
		});

		registerAppResource(
			server,
			'Stocks Widget',
			'ui://stocks-ui',
			{
				description: 'UI of the stocks tool',
			},
			async () => {
				const html = await env.ASSETS.fetch(new URL('http://hello/index.html'));
				return {
					contents: [
						{
							uri: 'ui://stocks-ui',
							text: await html.text(),
							mimeType: RESOURCE_MIME_TYPE,
						},
					],
				};
			}
		);

		registerAppTool(
			server,
			'get-stock-price',
			{
				description: 'Get the price of a stock given a ticker symbol',
				inputSchema: {
					symbol: z.string().optional(),
				},
				_meta: {
					ui: {
						resourceUri: 'ui://stocks-ui',
					},
					'openai/toolInvocation/invoking': 'Getting stocks...',
					'openai/toolInvocation/invoked': 'Search complete',
				},
				annotations: {
					openWorldHint: true,
					readOnlyHint: true,
				},
			},
			async ({ symbol }) => {
				return {
					content: [
						{
							type: 'text',
							text: `The price of ${symbol} is 10 USD`,
						},
					],
					structuredContent: {
						price: 10,
					},
				};
			}
		);

		const handler = createMcpHandler(server);

		return handler(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
