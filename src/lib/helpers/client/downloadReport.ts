import { isAxiosError } from 'axios';
import { axiosA } from '#lib/adapters/Axios.adapter.ts';
import { getApiErrorMessage } from './getApiErrorMessage.ts';

export async function downloadReport(url: string, fileName: string): Promise<void> {
	let blob: Blob;
	try {
		const response = await axiosA.get(url, true);
		if (!(response.data instanceof Blob) || response.data.size === 0) {
			throw new Error('El servidor devolvió un archivo vacío o inválido.');
		}
		blob = response.data;
	} catch (error) {
		if (isAxiosError(error) && error.response?.data instanceof Blob) {
			const body = error.response.data;
			if (body.type.toLowerCase().includes('json')) {
				let parsed: unknown;
				try {
					parsed = JSON.parse(await body.text());
				} catch {
					throw new Error(`La API respondió con el error HTTP ${error.response.status}.`);
				}
				if (parsed && typeof parsed === 'object' && 'message' in parsed) {
					const message = parsed.message;
					if (typeof message === 'string') throw new Error(message);
					if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
						throw new Error(message.join('. '));
					}
				}
			}
		}
		throw new Error(getApiErrorMessage(error));
	}

	const fileUrl = URL.createObjectURL(blob);
	const link = document.createElement('a');
	try {
		link.href = fileUrl;
		link.download = fileName;
		document.body.append(link);
		link.click();
	} finally {
		link.remove();
		window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
	}
}
