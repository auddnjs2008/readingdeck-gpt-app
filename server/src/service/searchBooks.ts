export const SEARCH_BOOKS_ENDPOINT = '/books/search';

export type SearchBooksRequest = {
	baseUrl: string;
	query: string;
	limit?: number;
	accessToken?: string;
	signal?: AbortSignal;
};

export type SearchBooksResponse = {
	items: Array<{
		title: string;
		author: string;
		publisher?: string;
		isbn?: string;
		thumbnail?: string | null;
		contents?: string;
	}>;
	meta?: {
		isEnd?: boolean;
		pageableCount?: number;
		totalCount?: number;
	};
};

type KakaoBookSearchResponse = {
	documents: Array<{
		title: string;
		authors?: string[];
		publisher?: string;
		isbn?: string;
		thumbnail?: string;
		contents?: string;
	}>;
	meta?: {
		is_end?: boolean;
		pageable_count?: number;
		total_count?: number;
	};
};

export class SearchBooksError extends Error {
	constructor(message: string, public readonly status: number, public readonly detail?: unknown) {
		super(message);
		this.name = 'SearchBooksError';
	}
}

export async function searchBooks({
	baseUrl,
	query,
	limit = 10,
	accessToken,
	signal,
}: SearchBooksRequest): Promise<SearchBooksResponse> {
	const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
	const trimmedQuery = query.trim();

	if (!trimmedBaseUrl) {
		throw new Error('baseUrl is required.');
	}

	if (!trimmedQuery) {
		throw new Error('query is required.');
	}

	const headers = new Headers();

	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	const response = await fetch(
		`${trimmedBaseUrl}${SEARCH_BOOKS_ENDPOINT}?query=${encodeURIComponent(trimmedQuery)}&size=${encodeURIComponent(String(limit))}`,
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

		throw new SearchBooksError('Failed to search books.', response.status, detail);
	}

	const result = (await response.json()) as KakaoBookSearchResponse;

	return {
		items: result.documents.map((book) => ({
			title: book.title,
			author: book.authors?.join(', ') || '저자 미상',
			publisher: book.publisher,
			isbn: book.isbn,
			thumbnail: book.thumbnail || null,
			contents: book.contents,
		})),
		meta: result.meta
			? {
					isEnd: result.meta.is_end,
					pageableCount: result.meta.pageable_count,
					totalCount: result.meta.total_count,
				}
			: undefined,
	};
}
