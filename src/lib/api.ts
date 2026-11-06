import { apiUrl } from '../config/api';
import { clearSession, getToken } from './session';

export const UNAUTHORIZED_EVENT = 'granbar:unauthorized';

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  headers?: HeadersInit;
  auth?: boolean;
  handleUnauthorized?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['error', 'message', 'mensaje']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }

  if (typeof payload === 'string' && payload.trim()) return payload;
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    signal,
    headers: extraHeaders,
    auth = true,
    handleUnauthorized = true,
  } = options;

  const headers = new Headers(extraHeaders);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  if (auth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa la URL del backend y tu conexión.',
      0
    );
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && handleUnauthorized) {
      clearSession();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(
      messageFromPayload(data, `Error del servidor (${response.status})`),
      response.status,
      data
    );
  }

  return data as T;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function wasAborted(error: unknown): boolean {
  return isAbortError(error);
}
