import { redirect } from '@sveltejs/kit';
import { getDataSource } from '#lib/server/database.ts';
import { EntidadOnapre } from '#lib/server/personal/entities/onapre.entity.ts';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';
import type { PageServerLoad } from './$types';

const SESSION_COOKIE = 'x-token';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) redirect(303, '/login');

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	if (!session) {
		redirect(303, '/login');
	}


	if (session.user.tipo !== 'A') redirect(303, '/');

	const records = await (await getDataSource()).getRepository(EntidadOnapre).find({
		order: { tipoPersonal: 'ASC', rango: 'ASC', claseFuncionario: 'ASC' }
	});

	return {
		records: records.map((record) => ({ ...record }))
	};
};
