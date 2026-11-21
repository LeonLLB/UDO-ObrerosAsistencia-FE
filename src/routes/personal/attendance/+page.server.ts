import { redirect } from '@sveltejs/kit';
import { getDataSource } from '#lib/server/database.ts';
import { EntidadArea } from '#lib/server/areas/entities/area.entity.ts';
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


	const departments = await (await getDataSource()).getRepository(EntidadArea).find({
		select: { id: true, nombre: true },
		order: { nombre: 'ASC' }
	});

	return { departments: departments.map((department) => ({ ...department })) };
};
