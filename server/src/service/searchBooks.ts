import { ReadingDeckAuth, requestReadingDeck } from './requestReadingDeck';

export const SEARCH_BOOKS_ENDPOINT = '/books/search';

export type SearchBooksRequest = {
	baseUrl: string;
	query: string;
	limit?: number;
	auth?: ReadingDeckAuth;
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
	auth,
	signal,
}: SearchBooksRequest): Promise<SearchBooksResponse> {
	const trimmedQuery = query.trim();

	if (!trimmedQuery) {
		throw new Error('query is required.');
	}

	const { data } = await requestReadingDeck<KakaoBookSearchResponse, SearchBooksError>({
		baseUrl,
		path: `${SEARCH_BOOKS_ENDPOINT}?query=${encodeURIComponent(trimmedQuery)}&size=${encodeURIComponent(String(limit))}`,
		method: 'GET',
		auth,
		signal,
		errorFactory: (errorMessage, status, detail) =>
			new SearchBooksError(errorMessage, status, detail),
		errorMessage: 'Failed to search books.',
	});

	return {
		items: data.documents.map((book) => ({
			title: book.title,
			author: book.authors?.join(', ') || '저자 미상',
			publisher: book.publisher,
			isbn: book.isbn,
			thumbnail: book.thumbnail || null,
			contents: book.contents,
		})),
		meta: data.meta
			? {
				isEnd: data.meta.is_end,
				pageableCount: data.meta.pageable_count,
				totalCount: data.meta.total_count,
			}
			: undefined,
	};
}
