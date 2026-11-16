import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDataSource } from '#lib/server/database.ts';
import { EntidadPermiso } from '#lib/server/attendance/entities/permission.entity.ts';
import { EntidadPersonal } from '#lib/server/personal/entities/personal.entity.ts';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';

const SESSION_COOKIE = 'x-token';
const SESSION_DURATION_SECONDS = 20 * 60;

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) redirect(303, '/login');

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	if (!session) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login');
	}

	cookies.set(SESSION_COOKIE, session.token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		path: '/',
		maxAge: SESSION_DURATION_SECONDS
	});

	if (session.user.tipo !== 'A') redirect(303, '/');

	const source = await getDataSource();
	const [employees, permissions] = await Promise.all([
		source.getRepository(EntidadPersonal).find({
			select: {
				id: true,
				cedula: true,
				nombres: true,
				apellidos: true
			},
			order: { apellidos: 'ASC', nombres: 'ASC' }
		}),
		source.getRepository(EntidadPermiso).find({
			relations: { personal: true },
			order: { fechaInicio: 'DESC' }
		})
	]);

	const dateParts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Caracas',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date());
	const datePart = (type: string) => dateParts.find((part) => part.type === type)?.value ?? '';
	const today = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;

	return {
		employees: employees.map((employee) => ({ ...employee })),
		permissions: permissions.map((permission) => ({
			...permission,
			personal: {
				id: permission.personal.id,
				cedula: permission.personal.cedula,
				nombres: permission.personal.nombres,
				apellidos: permission.personal.apellidos
			}
		})),
		today
	};
};
