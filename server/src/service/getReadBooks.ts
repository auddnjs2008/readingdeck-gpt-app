import { ReadingDeckAuth, requestReadingDeck } from './requestReadingDeck';

export const GET_READ_BOOKS_ENDPOINT = '/books';

export type GetReadBooksRequest = {
	baseUrl: string;
	limit?: number;
	auth?: ReadingDeckAuth;
	signal?: AbortSignal;
};

export type GetReadBooksResponse = {
	items: Array<{
		bookId: number;
		title: string;
		author: string;
		cardCount?: number;
		progressPercent?: number;
		backgroundImage?: string | null;
		status?: 'reading' | 'finished' | 'paused';
	}>;
	meta?: {
		total: number;
		page: number;
		take: number;
		totalPages: number;
	};
};

type BooksApiResponse = {
	items: Array<{
		id: number;
		title: string;
		author: string;
		cardCount?: number;
		progressPercent?: number;
		backgroundImage?: string | null;
		status?: 'reading' | 'finished' | 'paused';
	}>;
	meta?: {
		total: number;
		page: number;
		take: number;
		totalPages: number;
	};
};

export class GetReadBooksError extends Error {
	constructor(message: string, public readonly status: number, public readonly detail?: unknown) {
		super(message);
		this.name = 'GetReadBooksError';
	}
}

export async function getReadBooks({
	baseUrl,
	limit = 10,
	auth,
	signal,
}: GetReadBooksRequest): Promise<GetReadBooksResponse> {
	const { data } = await requestReadingDeck<BooksApiResponse, GetReadBooksError>({
		baseUrl,
		path: `${GET_READ_BOOKS_ENDPOINT}?page=1&take=${encodeURIComponent(String(limit))}&sort=updatedAt`,
		method: 'GET',
		auth,
		signal,
		errorFactory: (errorMessage, status, detail) =>
			new GetReadBooksError(errorMessage, status, detail),
		errorMessage: 'Failed to fetch books.',
	});

	return {
		items: data.items.map((book) => ({
			bookId: book.id,
			title: book.title,
			author: book.author,
			cardCount: book.cardCount,
			progressPercent: book.progressPercent,
			backgroundImage: book.backgroundImage ?? null,
			status: book.status,
		})),
		meta: data.meta,
	};
}
