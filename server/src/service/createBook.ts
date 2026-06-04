import { ReadingDeckAuth, requestReadingDeck } from './requestReadingDeck';

export const CREATE_BOOK_ENDPOINT = '/books';

export type CreateBookRequest = {
	baseUrl: string;
	auth?: ReadingDeckAuth;
	signal?: AbortSignal;
	body: {
		title: string;
		author: string;
		publisher: string;
		contents?: string;
		imageUrl?: string;
		status?: 'reading' | 'finished' | 'paused';
		currentPage?: number;
		totalPages?: number;
		startedAt?: string;
		finishedAt?: string;
	};
};

export type CreateBookResponse = {
	id: number;
	title: string;
	author: string;
	backgroundImage?: string | null;
	status?: 'reading' | 'finished' | 'paused';
	progressPercent?: number;
};

export class CreateBookError extends Error {
	constructor(message: string, public readonly status: number, public readonly detail?: unknown) {
		super(message);
		this.name = 'CreateBookError';
	}
}

export async function createBook({
	baseUrl,
	auth,
	signal,
	body,
}: CreateBookRequest): Promise<CreateBookResponse> {
	const { data } = await requestReadingDeck<CreateBookResponse, CreateBookError>({
		baseUrl,
		path: CREATE_BOOK_ENDPOINT,
		method: 'POST',
		body,
		auth,
		signal,
		errorFactory: (errorMessage, status, detail) =>
			new CreateBookError(errorMessage, status, detail),
		errorMessage: 'Failed to create book.',
	});

	return data;
}
