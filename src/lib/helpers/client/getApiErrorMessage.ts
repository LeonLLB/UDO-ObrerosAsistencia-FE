import { isAxiosError } from "axios";

    
export const getApiErrorMessage = (error: unknown): string => {
        if (isAxiosError(error)) {
            const data: unknown = error.response?.data;
            if (data && typeof data === 'object' && 'message' in data) {
                const message = data.message;
                if (typeof message === 'string') return message;
                if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
                    return message.join('. ');
                }
            }

            if (error.response) return `La API respondió con el error HTTP ${error.response.status}.`;
            return 'No se pudo conectar con la API. Verifica la URL, la red y la configuración CORS.';
        }

        return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    };
