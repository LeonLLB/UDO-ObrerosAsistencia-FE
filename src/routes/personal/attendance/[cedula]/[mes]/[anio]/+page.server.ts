import { redirect } from '@sveltejs/kit';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';
import type { PageServerLoad } from './$types';

const SESSION_COOKIE = 'x-token';

export const load: PageServerLoad = async ({ cookies, url, params }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) redirect(303, '/login');

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	if (!session) {
		redirect(303, '/login');
	}


	return {
		cedula: params.cedula,
		mes: params.mes,
		anio: params.anio
	};
};
