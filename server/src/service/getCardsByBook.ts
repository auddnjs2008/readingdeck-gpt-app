import { ReadingDeckAuth, requestReadingDeck } from './requestReadingDeck';

export const GET_CARDS_BY_BOOK_ENDPOINT = '/cards/by-book';

export type GetCardsByBookRequest = {
	baseUrl: string;
	bookId: number;
	limit?: number;
	auth?: ReadingDeckAuth;
	signal?: AbortSignal;
};

export type GetCardsByBookResponse = {
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
	book: {
		bookId: number;
		title: string;
		author: string;
	};
};

export class GetCardsByBookError extends Error {
	constructor(message: string, public readonly status: number, public readonly detail?: unknown) {
		super(message);
		this.name = 'GetCardsByBookError';
	}
}

export async function getCardsByBook({
	baseUrl,
	bookId,
	limit = 10,
	auth,
	signal,
}: GetCardsByBookRequest): Promise<GetCardsByBookResponse> {
	const { data } = await requestReadingDeck<GetCardsByBookResponse, GetCardsByBookError>({
		baseUrl,
		path: `${GET_CARDS_BY_BOOK_ENDPOINT}/${bookId}?take=${encodeURIComponent(String(limit))}`,
		method: 'GET',
		auth,
		signal,
		errorFactory: (errorMessage, status, detail) =>
			new GetCardsByBookError(errorMessage, status, detail),
		errorMessage: 'Failed to fetch cards by book.',
	});

	return data;
}
