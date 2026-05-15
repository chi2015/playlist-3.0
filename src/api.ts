export const PLAYLIST_SERVER = 'https://chi247.vercel.app/api/playlist';

export const paramsToBodyStr = (params: Record<string, unknown>): string =>
  Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

export type RemoteResponse = {
  ok?: boolean;
  date?: string;
  pl_date?: string;
  year?: number;
  list?: unknown[];
  error?: string;
};

export async function remote<T extends RemoteResponse = RemoteResponse>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const body = paramsToBodyStr({ ...params, action });
  const res = await fetch(PLAYLIST_SERVER, {
    method: 'POST',
    headers: {
      Accept: 'application/json, application/xml, text/play, text/html, *.*',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body,
  });
  return res.json() as Promise<T>;
}
