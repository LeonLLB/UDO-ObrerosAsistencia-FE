import { PUBLIC_API_URL_SERVER } from '$app/env/private';

export type AuthenticatedUser = {
	cedula: string;
	nombres: string;
	apellidos: string;
	tipo: string;
};

type RenewedSession = {
	usuario: AuthenticatedUser;
	newToken: string;
};

function isRenewedSession(value: unknown): value is RenewedSession {
	if (!value || typeof value !== 'object') return false;
	const session = value as Partial<RenewedSession>;
	const user = session.usuario;

	return (
		typeof session.newToken === 'string' &&
		!!session.newToken &&
		!!user &&
		typeof user.cedula === 'string' &&
		typeof user.nombres === 'string' &&
		typeof user.apellidos === 'string' &&
		typeof user.tipo === 'string'
	);
}

class usersMiddlewares {
	async checkIfUserLoggedIn(
		token: string
	): Promise<{ user: AuthenticatedUser; token: string } | null> {
		if (!token) return null;

		const response = await fetch(
			`${PUBLIC_API_URL_SERVER}/auth/revalidate/${encodeURIComponent(token)}`
		);
		if (response.status === 401 || response.status === 403) return null;
		if (!response.ok) {
			throw new Error(`Session validation failed with backend HTTP ${response.status}.`);
		}

		const payload: unknown = await response.json();
		if (!isRenewedSession(payload)) {
			throw new Error('The backend returned an invalid session validation response.');
		}

		return { user: payload.usuario, token: payload.newToken };
	}
}

export const UsersMiddlewares = new usersMiddlewares();