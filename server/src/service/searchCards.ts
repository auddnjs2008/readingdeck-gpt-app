import { ReadingDeckAuth, requestReadingDeck } from './requestReadingDeck';

export const SEARCH_CARDS_ENDPOINT = '/card-embeddings/search/cards';

export type SearchCardsRequest = {
	baseUrl: string;
	message: string;
	limit?: number;
	auth?: ReadingDeckAuth;
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
	auth,
	cookie,
	signal,
}: SearchCardsRequest): Promise<SearchCardsResponse> {
	const trimmedMessage = message.trim();

	if (!trimmedMessage) {
		throw new Error('message is required.');
	}

	const headers = cookie
		? {
			Cookie: cookie,
		}
		: undefined;

	const { data } = await requestReadingDeck<SearchCardsResponse, SearchCardsError>({
		baseUrl,
		path: SEARCH_CARDS_ENDPOINT,
		method: 'POST',
		body: {
			message: trimmedMessage,
			limit,
		},
		auth,
		signal,
		headers,
		errorFactory: (errorMessage, status, detail) =>
			new SearchCardsError(errorMessage, status, detail),
		errorMessage: 'Failed to search cards.',
	});

	return data;
}
