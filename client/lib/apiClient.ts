export interface ApiError extends Error {
  status: number;
  payload?: unknown;
}

const defaultHeaders = {
  "Content-Type": "application/json",
};

export async function apiRequest<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType ? contentType.includes("application/json") : false;
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error: ApiError = Object.assign(new Error("Request failed"), {
      status: response.status,
      payload: body,
    });
    throw error;
  }

  return body as T;
}
