import { defineEnvVars } from '@sveltejs/kit/env';

function validateApiUrl(name: string, value: string | undefined): string {
	if (!value?.trim()) {
		throw new Error(`${name} must be set to the backend URL`);
	}

	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error(`${name} must be a valid absolute URL`);
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(`${name} must use HTTP or HTTPS`);
	}

	return value.trim().replace(/\/+$/, '');
}

export const variables = defineEnvVars({
	VITE_API_URL: {
		public: true,
		schema: (value) => validateApiUrl('VITE_API_URL', value)
	},
	PUBLIC_API_URL_SERVER: {
		schema: (value) => validateApiUrl('PUBLIC_API_URL_SERVER', value)
	},
	HOST_BD: { schema: (value) => value },
	PUERTO_BD: { schema: (value) => value },
	USUARIO_BD: { schema: (value) => value },
	CLAVE_BD: { schema: (value) => value },
	NOMBRE_BD: { schema: (value) => value }
});
