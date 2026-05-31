export const CREATE_BOOK_ENDPOINT = '/books';

export type CreateBookRequest = {
	baseUrl: string;
	accessToken?: string;
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
	accessToken,
	signal,
	body,
}: CreateBookRequest): Promise<CreateBookResponse> {
	const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

	if (!trimmedBaseUrl) {
		throw new Error('baseUrl is required.');
	}

	const headers = new Headers({
		'content-type': 'application/json',
	});

	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	const response = await fetch(`${trimmedBaseUrl}${CREATE_BOOK_ENDPOINT}`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
		signal,
	});

	if (!response.ok) {
		let detail: unknown = null;

		try {
			detail = await response.json();
		} catch {
			detail = await response.text();
		}

		throw new CreateBookError('Failed to create book.', response.status, detail);
	}

	return (await response.json()) as CreateBookResponse;
}
