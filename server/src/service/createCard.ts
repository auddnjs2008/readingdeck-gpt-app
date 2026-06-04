import { ReadingDeckAuth, requestReadingDeck } from './requestReadingDeck';

export const CREATE_CARD_ENDPOINT = '/books';
export const GET_CARD_DETAIL_ENDPOINT = '/cards';

export type CreateCardRequest = {
	baseUrl: string;
	bookId: number;
	auth?: ReadingDeckAuth;
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

export async function createCard({
	baseUrl,
	bookId,
	auth,
	signal,
	body,
}: CreateCardRequest): Promise<CreateCardResult> {
	const createdResult = await requestReadingDeck<CreatedCardResponse, CreateCardError>({
		baseUrl,
		path: `${CREATE_CARD_ENDPOINT}/${bookId}/cards`,
		method: 'POST',
		body,
		auth,
		signal,
		errorFactory: (errorMessage, status, detail) =>
			new CreateCardError(errorMessage, status, detail),
		errorMessage: 'Failed to create card.',
	});

	const detailResult = await requestReadingDeck<CardDetailResponse, CreateCardError>({
		baseUrl,
		path: `${GET_CARD_DETAIL_ENDPOINT}/${createdResult.data.id}`,
		method: 'GET',
		auth: createdResult.auth,
		signal,
		errorFactory: (errorMessage, status, detail) =>
			new CreateCardError(errorMessage, status, detail),
		errorMessage: 'Failed to fetch created card detail.',
	});

	const card = detailResult.data;

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
