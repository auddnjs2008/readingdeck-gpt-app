export const GET_CARDS_BY_BOOK_ENDPOINT = '/cards/by-book';

export type GetCardsByBookRequest = {
	baseUrl: string;
	bookId: number;
	limit?: number;
	accessToken?: string;
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
	accessToken,
	signal,
}: GetCardsByBookRequest): Promise<GetCardsByBookResponse> {
	const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

	if (!trimmedBaseUrl) {
		throw new Error('baseUrl is required.');
	}

	const headers = new Headers();

	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	const response = await fetch(
		`${trimmedBaseUrl}${GET_CARDS_BY_BOOK_ENDPOINT}/${bookId}?take=${encodeURIComponent(String(limit))}`,
		{
			method: 'GET',
			headers,
			signal,
		},
	);

	if (!response.ok) {
		let detail: unknown = null;

		try {
			detail = await response.json();
		} catch {
			detail = await response.text();
		}

		throw new GetCardsByBookError('Failed to fetch cards by book.', response.status, detail);
	}

	return (await response.json()) as GetCardsByBookResponse;
}
