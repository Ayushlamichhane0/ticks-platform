import { authorizeAdmin, jsonResponse } from '../lib/admin-auth.js';

export const config = {
  path: '/.netlify/functions/admin-check',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { success: false, message: 'Method not allowed' });
  }

  const authorization = await authorizeAdmin(event);
  if (authorization.response) return authorization.response;

  return jsonResponse(200, { success: true, isAdmin: true });
}
