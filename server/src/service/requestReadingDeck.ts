export type ReadingDeckAuth = {
	accessToken?: string;
	refreshToken?: string;
};

type RefreshResponse = {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
};

type RequestReadingDeckOptions<T, E extends Error> = {
	baseUrl: string;
	path: string;
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	auth?: ReadingDeckAuth;
	signal?: AbortSignal;
	headers?: HeadersInit;
	errorFactory: (message: string, status: number, detail?: unknown) => E;
	errorMessage: string;
};

export type RequestReadingDeckResult<T> = {
	data: T;
	auth: ReadingDeckAuth;
	refreshed: boolean;
};

export class ReadingDeckReauthRequiredError extends Error {
	readonly status = 401;

	constructor(message = 'ReadingDeck authorization has expired.', public readonly detail?: unknown) {
		super(message);
		this.name = 'ReadingDeckReauthRequiredError';
	}
}

function trimBaseUrl(baseUrl: string) {
	return baseUrl.trim().replace(/\/+$/, '');
}

function buildHeaders(headersInit?: HeadersInit, accessToken?: string, hasJsonBody?: boolean) {
	const headers = new Headers(headersInit);

	if (hasJsonBody && !headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}

	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	return headers;
}

async function parseFailureDetail(response: Response) {
	try {
		return await response.json();
	} catch {
		return await response.text();
	}
}

async function refreshReadingDeckToken(baseUrl: string, refreshToken: string, signal?: AbortSignal) {
	const response = await fetch(`${baseUrl}/auth/mcp/refresh`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			refreshToken,
		}),
		signal,
	});

	if (!response.ok) {
		return null;
	}

	return (await response.json()) as RefreshResponse;
}

export async function requestReadingDeck<T, E extends Error>({
	baseUrl,
	path,
	method = 'GET',
	body,
	auth,
	signal,
	headers,
	errorFactory,
	errorMessage,
}: RequestReadingDeckOptions<T, E>): Promise<RequestReadingDeckResult<T>> {
	const normalizedBaseUrl = trimBaseUrl(baseUrl);

	if (!normalizedBaseUrl) {
		throw new Error('baseUrl is required.');
	}

	let currentAuth: ReadingDeckAuth = {
		accessToken: auth?.accessToken,
		refreshToken: auth?.refreshToken,
	};

	const makeRequest = async (accessToken?: string) =>
		fetch(`${normalizedBaseUrl}${path}`, {
			method,
			headers: buildHeaders(headers, accessToken, body !== undefined),
			body: body === undefined ? undefined : JSON.stringify(body),
			signal,
		});

	let response = await makeRequest(currentAuth.accessToken);
	let refreshed = false;

	if (response.status === 401) {
		if (!currentAuth.refreshToken) {
			const detail = await parseFailureDetail(response);
			throw new ReadingDeckReauthRequiredError(
				'ReadingDeck refresh token is missing.',
				detail
			);
		}

		const refreshedTokens = await refreshReadingDeckToken(
			normalizedBaseUrl,
			currentAuth.refreshToken,
			signal
		);

		if (!refreshedTokens) {
			throw new ReadingDeckReauthRequiredError('ReadingDeck token refresh failed.');
		}

		currentAuth = {
			accessToken: refreshedTokens.accessToken,
			refreshToken: refreshedTokens.refreshToken,
		};
		refreshed = true;
		response = await makeRequest(currentAuth.accessToken);

		if (response.status === 401) {
			const detail = await parseFailureDetail(response);
			throw new ReadingDeckReauthRequiredError(
				'ReadingDeck authorization is still invalid after refresh.',
				detail
			);
		}
	}

	if (!response.ok) {
		const detail = await parseFailureDetail(response);
		throw errorFactory(errorMessage, response.status, detail);
	}

	return {
		data: (await response.json()) as T,
		auth: currentAuth,
		refreshed,
	};
}
