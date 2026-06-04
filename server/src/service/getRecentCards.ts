import { ReadingDeckAuth, requestReadingDeck } from './requestReadingDeck';

export const GET_RECENT_CARDS_ENDPOINT = '/cards/recent';

export type GetRecentCardsRequest = {
	baseUrl: string;
	limit?: number;
	auth?: ReadingDeckAuth;
	signal?: AbortSignal;
};

export type GetRecentCardsResponse = {
	items: Array<{
		cardId: number;
		type: 'insight' | 'change' | 'action' | 'question';
		thought: string;
		quote: string | null;
		bookTitle: string;
		author: string;
		pageStart: number | null;
		pageEnd: number | null;
		distance: number | null;
		createdAt: string;
	}>;
};

export class GetRecentCardsError extends Error {
	constructor(message: string, public readonly status: number, public readonly detail?: unknown) {
		super(message);
		this.name = 'GetRecentCardsError';
	}
}

export async function getRecentCards({
	baseUrl,
	limit = 10,
	auth,
	signal,
}: GetRecentCardsRequest): Promise<GetRecentCardsResponse> {
	const { data } = await requestReadingDeck<GetRecentCardsResponse, GetRecentCardsError>({
		baseUrl,
		path: `${GET_RECENT_CARDS_ENDPOINT}?limit=${encodeURIComponent(String(limit))}`,
		method: 'GET',
		auth,
		signal,
		errorFactory: (errorMessage, status, detail) =>
			new GetRecentCardsError(errorMessage, status, detail),
		errorMessage: 'Failed to fetch recent cards.',
	});

	return data;
}
