import { getApiBaseUrl } from '../config/apiConfig';

let resolvedUrl: string | null = null;

export async function getAuthApiUrl(): Promise<string> {
  if (resolvedUrl) return resolvedUrl;
  resolvedUrl = getApiBaseUrl();
  console.log(`[AuthAPI] ✅ Backend at: ${resolvedUrl}`);
  return resolvedUrl;
}

export async function registerUser(username: string, password: string) {
  const url = await getAuthApiUrl();
  const res = await fetch(`${url}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  return data;
}

export async function loginUser(username: string, password: string) {
  const url = await getAuthApiUrl();
  const res = await fetch(`${url}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data;
}
