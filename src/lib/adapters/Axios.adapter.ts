import Axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

class AxiosAdapter {
	private readonly apiUrl = import.meta.env.VITE_API_URL;

	async get(url: string, isBlob = false): Promise<AxiosResponse> {
		return Axios.get(this.apiUrl + url, {
			withCredentials: true,
			responseType: isBlob ? 'blob' : undefined
		});
	}

	async post<TD>(url: string, body: TD | null = null): Promise<AxiosResponse> {
		return Axios.post(this.apiUrl + url, body, {
			withCredentials: true
		});
	}

	async postWithHeaders<TD>(
		url: string,
		body: TD | null = null,
		headers: AxiosRequestConfig<TD>['headers']
	): Promise<AxiosResponse> {
		return Axios.post(this.apiUrl + url, body, {
			withCredentials: true,
			headers
		});
	}

	async put<TD>(url: string, body: TD | null = null): Promise<AxiosResponse> {
		return Axios.put(this.apiUrl + url, body, {
			withCredentials: true
		});
	}

	async delete(url: string): Promise<AxiosResponse> {
		return Axios.delete(this.apiUrl + url, {
			withCredentials: true
		});
	}

}

export const axiosA = new AxiosAdapter();