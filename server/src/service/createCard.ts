export const CREATE_CARD_ENDPOINT = '/books';
export const GET_CARD_DETAIL_ENDPOINT = '/cards';

export type CreateCardRequest = {
	baseUrl: string;
	bookId: number;
	accessToken?: string;
	signal?: AbortSignal;
	body: {
		type: 'insight' | 'change' | 'action' | 'question';
		title?: string;
		quote?: string;
		thought: string;
		pageStart?: number;
		pageEnd?: number;
	};
};

type CreatedCardResponse = {
	id: number;
	type: 'insight' | 'change' | 'action' | 'question';
};

type CardDetailResponse = {
	id: number;
	type: 'insight' | 'change' | 'action' | 'question';
	quote?: string | null;
	thought: string;
	pageStart?: number | null;
	pageEnd?: number | null;
	createdAt: string;
	book: {
		id: number;
		title: string;
		author: string;
	};
};

export type CreateCardResult = {
	cardId: number;
	type: 'insight' | 'change' | 'action' | 'question';
	thought: string;
	quote: string | null;
	bookTitle: string;
	author: string;
	pageStart: number | null;
	pageEnd: number | null;
	distance: null;
	createdAt: string;
};

export class CreateCardError extends Error {
	constructor(message: string, public readonly status: number, public readonly detail?: unknown) {
		super(message);
		this.name = 'CreateCardError';
	}
}

function buildHeaders(accessToken?: string) {
	const headers = new Headers({
		'content-type': 'application/json',
	});

	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	return headers;
}

export async function createCard({
	baseUrl,
	bookId,
	accessToken,
	signal,
	body,
}: CreateCardRequest): Promise<CreateCardResult> {
	const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

	if (!trimmedBaseUrl) {
		throw new Error('baseUrl is required.');
	}

	const createResponse = await fetch(`${trimmedBaseUrl}${CREATE_CARD_ENDPOINT}/${bookId}/cards`, {
		method: 'POST',
		headers: buildHeaders(accessToken),
		body: JSON.stringify(body),
		signal,
	});

	if (!createResponse.ok) {
		let detail: unknown = null;

		try {
			detail = await createResponse.json();
		} catch {
			detail = await createResponse.text();
		}

		throw new CreateCardError('Failed to create card.', createResponse.status, detail);
	}

	const created = (await createResponse.json()) as CreatedCardResponse;

	const detailResponse = await fetch(`${trimmedBaseUrl}${GET_CARD_DETAIL_ENDPOINT}/${created.id}`, {
		method: 'GET',
		headers: buildHeaders(accessToken),
		signal,
	});

	if (!detailResponse.ok) {
		let detail: unknown = null;

		try {
			detail = await detailResponse.json();
		} catch {
			detail = await detailResponse.text();
		}

		throw new CreateCardError('Failed to fetch created card detail.', detailResponse.status, detail);
	}

	const card = (await detailResponse.json()) as CardDetailResponse;

	return {
		cardId: card.id,
		type: card.type,
		thought: card.thought,
		quote: card.quote ?? null,
		bookTitle: card.book.title,
		author: card.book.author,
		pageStart: card.pageStart ?? null,
		pageEnd: card.pageEnd ?? null,
		distance: null,
		createdAt: card.createdAt,
	};
}
