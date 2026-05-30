export const GET_RECENT_CARDS_ENDPOINT = '/cards/recent';

export type GetRecentCardsRequest = {
	baseUrl: string;
	limit?: number;
	accessToken?: string;
	signal?: AbortSignal;
};

export type GetRecentCardsResponse = {
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
};

export class GetRecentCardsError extends Error {
	constructor(message: string, public readonly status: number, public readonly detail?: unknown) {
		super(message);
		this.name = 'GetRecentCardsError';
	}
}

export async function getRecentCards({
	baseUrl,
	limit = 10,
	accessToken,
	signal,
}: GetRecentCardsRequest): Promise<GetRecentCardsResponse> {
	const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');

	if (!trimmedBaseUrl) {
		throw new Error('baseUrl is required.');
	}

	const headers = new Headers();

	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	const response = await fetch(
		`${trimmedBaseUrl}${GET_RECENT_CARDS_ENDPOINT}?limit=${encodeURIComponent(String(limit))}`,
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

		throw new GetRecentCardsError('Failed to fetch recent cards.', response.status, detail);
	}

	return (await response.json()) as GetRecentCardsResponse;
}
