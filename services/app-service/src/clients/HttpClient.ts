import fetch from 'node-fetch';

class HttpClient {
  async post<T>(url: string, body?: object, headers: Record<string, string> = {}): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.detail?.error || data?.error || 'upstream service error';
      throw new Error(message);
    }

    return data as T;
  }
}

export default HttpClient;
