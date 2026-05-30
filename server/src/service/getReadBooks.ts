export const GET_READ_BOOKS_ENDPOINT = '/books';

export type GetReadBooksRequest = {
	baseUrl: string;
	limit?: number;
	accessToken?: string;
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
	accessToken,
	signal,
}: GetReadBooksRequest): Promise<GetReadBooksResponse> {
	const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

	if (!trimmedBaseUrl) {
		throw new Error('baseUrl is required.');
	}

	const headers = new Headers();

	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	const response = await fetch(
		`${trimmedBaseUrl}${GET_READ_BOOKS_ENDPOINT}?page=1&take=${encodeURIComponent(String(limit))}&sort=updatedAt`,
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

		throw new GetReadBooksError('Failed to fetch books.', response.status, detail);
	}

	const result = (await response.json()) as BooksApiResponse;

	return {
		items: result.items.map((book) => ({
			bookId: book.id,
			title: book.title,
			author: book.author,
			cardCount: book.cardCount,
			progressPercent: book.progressPercent,
			backgroundImage: book.backgroundImage ?? null,
			status: book.status,
		})),
		meta: result.meta,
	};
}
