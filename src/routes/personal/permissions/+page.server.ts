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
	const dateParts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Caracas',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(new Date());
	const datePart = (type: string) => dateParts.find((part) => part.type === type)?.value ?? '';
	const today = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
	type EmployeePermissionRow = {
		employeeId: number;
		employeeCedula: string;
		employeeNombres: string;
		employeeApellidos: string;
		permissionId: number | null;
		permissionDescripcion: string | null;
		permissionPatologia: string | null;
		permissionFechaInicio: string | null;
		permissionFechaFin: string | null;
		permissionStatus: number | null;
	};

	const rows = await source
		.createQueryBuilder()
		.select('employee.id', 'employeeId')
		.addSelect('employee.cedula', 'employeeCedula')
		.addSelect('employee.nombres', 'employeeNombres')
		.addSelect('employee.apellidos', 'employeeApellidos')
		.addSelect('permission.id', 'permissionId')
		.addSelect('permission.descripcion', 'permissionDescripcion')
		.addSelect('permission.patologia', 'permissionPatologia')
		.addSelect("DATE_FORMAT(permission.fechaInicio, '%Y-%m-%d')", 'permissionFechaInicio')
		.addSelect("DATE_FORMAT(permission.fechaFin, '%Y-%m-%d')", 'permissionFechaFin')
		.addSelect('permission.status', 'permissionStatus')
		.from(EntidadPersonal, 'employee')
		.leftJoin(
			EntidadPermiso,
			'permission',
			'permission.personal_id = employee.id AND permission.status = :activeStatus AND permission.fecha_fin >= :today',
			{ activeStatus: 1, today }
		)
		.orderBy('employee.apellidos', 'ASC')
		.addOrderBy('employee.nombres', 'ASC')
		.addOrderBy('CASE WHEN permission.fechaInicio <= :today THEN 0 ELSE 1 END', 'ASC')
		.addOrderBy('permission.fechaInicio', 'ASC')
		.getRawMany<EmployeePermissionRow>();

	const employees = new Map<
		number,
		{
			id: number;
			cedula: string;
			nombres: string;
			apellidos: string;
			activePermission: {
				id: number;
				descripcion: string;
				patologia: string;
				fechaInicio: string;
				fechaFin: string;
				status: 0 | 1;
			} | null;
		}
	>();

	for (const row of rows) {
		if (employees.has(row.employeeId)) continue;
		employees.set(row.employeeId, {
			id: row.employeeId,
			cedula: row.employeeCedula,
			nombres: row.employeeNombres,
			apellidos: row.employeeApellidos,
			activePermission:
				row.permissionId === null ||
				row.permissionDescripcion === null ||
				row.permissionPatologia === null ||
				row.permissionFechaInicio === null ||
				row.permissionFechaFin === null ||
				row.permissionStatus === null
					? null
					: {
							id: row.permissionId,
							descripcion: row.permissionDescripcion,
							patologia: row.permissionPatologia,
							fechaInicio: row.permissionFechaInicio,
							fechaFin: row.permissionFechaFin,
							status: row.permissionStatus === 1 ? 1 : 0
						}
		});
	}

	return {
		employees: [...employees.values()],
		today
	};
};
