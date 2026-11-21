import { error, redirect } from '@sveltejs/kit';
import { getDataSource } from '#lib/server/database.ts';
import { EntidadPermiso } from '#lib/server/attendance/entities/permission.entity.ts';
import { EntidadPersonal } from '#lib/server/personal/entities/personal.entity.ts';
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


	if (session.user.tipo !== 'A') redirect(303, '/');

	const source = await getDataSource();
	const employee = await source.getRepository(EntidadPersonal).findOne({
		where: { cedula: params.cedula },
		select: { id: true, cedula: true, nombres: true, apellidos: true }
	});
	if (!employee) error(404, 'No se encontró el funcionario solicitado.');

	const permissions = await source.getRepository(EntidadPermiso).find({
		where: { personal: { id: employee.id } },
		order: { fechaInicio: 'DESC' }
	});

	const dateParts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Caracas',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date());
	const datePart = (type: string) => dateParts.find((part) => part.type === type)?.value ?? '';
	const today = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;

	return {
		employee: { ...employee },
		permissions: permissions.map((permission) => ({
			id: permission.id,
			descripcion: permission.descripcion,
			patologia: permission.patologia,
			fechaInicio: permission.fechaInicio,
			fechaFin: permission.fechaFin,
			status: permission.status
		})),
		today
	};
};
