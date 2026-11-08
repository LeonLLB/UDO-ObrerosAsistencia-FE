import 'reflect-metadata';
import { CLAVE_BD, HOST_BD, NOMBRE_BD, PUERTO_BD, USUARIO_BD } from '$app/env/private';
import { DataSource } from 'typeorm';
import { EntidadUsuario } from './users/user.entity';

let dataSource: DataSource | undefined;
let initialization: Promise<DataSource> | undefined;

function requiredEnv(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(`Missing required database environment variable: ${name}`);
	}
	return value;
}

function createDataSource(): DataSource {
	const port = Number(requiredEnv('PUERTO_BD', PUERTO_BD));
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error('PUERTO_BD must be a valid TCP port');
	}

	return new DataSource({
		type: 'mariadb',
		host: requiredEnv('HOST_BD', HOST_BD),
		port,
		username: requiredEnv('USUARIO_BD', USUARIO_BD),
		password: requiredEnv('CLAVE_BD', CLAVE_BD),
		database: requiredEnv('NOMBRE_BD', NOMBRE_BD),
		entities: [EntidadUsuario],
		synchronize: false
	});
}

export async function getDataSource(): Promise<DataSource> {
	if (dataSource?.isInitialized) return dataSource;
	if (initialization) return initialization;

	const source = createDataSource();
	dataSource = source;
	initialization = source
		.initialize()
		.then(() => source)
		.catch((error: unknown) => {
			if (dataSource === source) {
				dataSource = undefined;
				initialization = undefined;
			}
			throw error;
		});

	return initialization;
}
