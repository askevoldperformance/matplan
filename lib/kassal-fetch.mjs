const KASSAL_BASE = "https://kassal.app/api/v1";

export async function kassalFetch(path, searchParams) {
  const token = process.env.KASSAL_API_TOKEN;
  const url = new URL(`${KASSAL_BASE}${path}`);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return { status: res.status, data };
}
