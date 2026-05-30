export const SEARCH_CARDS_ENDPOINT = '/card-embeddings/search/cards';

export type SearchCardsRequest = {
	baseUrl: string;
	message: string;
	limit?: number;
	accessToken?: string;
	cookie?: string;
	signal?: AbortSignal;
};

export type SearchCardsResponse = {
	items: Array<{
		cardId: number;
		type: 'insight' | 'change' | 'action' | 'question';
		thought: string;
		quote: string | null;
		bookTitle: string;
		author: string;
		pageStart: number | null;
		pageEnd: number | null;
		distance: number;
	}>;
};

export class SearchCardsError extends Error {
	constructor(message: string, public readonly status: number, public readonly detail?: unknown) {
		super(message);
		this.name = 'SearchCardsError';
	}
}

export async function searchCards({
	baseUrl,
	message,
	limit = 5,
	accessToken,
	cookie,
	signal,
}: SearchCardsRequest): Promise<SearchCardsResponse> {
	const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
	const trimmedMessage = message.trim();

	if (!trimmedBaseUrl) {
		throw new Error('baseUrl is required.');
	}

	if (!trimmedMessage) {
		throw new Error('message is required.');
	}

	const headers = new Headers({
		'Content-Type': 'application/json',
	});

	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	if (cookie) {
		headers.set('Cookie', cookie);
	}

	const response = await fetch(`${trimmedBaseUrl}${SEARCH_CARDS_ENDPOINT}`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			message: trimmedMessage,
			limit,
		}),
		signal,
	});

	if (!response.ok) {
		let detail: unknown = null;

		try {
			detail = await response.json();
		} catch {
			detail = await response.text();
		}

		throw new SearchCardsError('Failed to search cards.', response.status, detail);
	}

	return (await response.json()) as SearchCardsResponse;
}
