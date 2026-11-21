export async function api<T>(path: string, options: {
  method?: string;
  token?: string;
  body?: unknown;
} = {}): Promise<T> {
  const headers = new Headers();
  if (options.token) headers.set("Authorization", "Bearer " + options.token);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch("/api" + path, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message?.toString() || "Requête refusée (" + response.status + ").");
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}
