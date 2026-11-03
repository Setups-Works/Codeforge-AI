/** Small fetch helpers for the admin course UI. Throws Error(message) on failure. */
export async function api<T = unknown>(url: string, init?: Omit<RequestInit, "body"> & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}
