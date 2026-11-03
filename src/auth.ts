import { createAuthClient } from '@neon/auth';
import { BetterAuthVanillaAdapter } from '@neon/auth/vanilla/adapters';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
console.log("AUTH URL LOADED:", import.meta.env.VITE_NEON_AUTH_URL);

export const authClient = authUrl
  ? createAuthClient(authUrl, {
      adapter: BetterAuthVanillaAdapter({
        fetchOptions: { credentials: 'include' },
      }),
    })
  : null;

export async function getAuthenticatedUser() {
  if (!authClient) return null;

  const { data, error } = await authClient.getSession();
  if (error) throw new Error(error.message);
  return data?.user ?? null;
}

export async function getAuthAccessToken() {
  if (!authClient) throw new Error('Neon Auth is not configured.');

  const { data, error } = await authClient.getSession();
  const token = data?.session?.token;
  if (error || !token) {
    throw new Error(error?.message ?? 'Unable to retrieve an authentication token.');
  }
  return token;
}
