const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' }),
    };
  }

  let contact;
  try {
    contact = JSON.parse(event.body || '');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Request body must be valid JSON' }),
    };
  }

  if (
    typeof contact?.name !== 'string' || !contact.name.trim() ||
    typeof contact?.email !== 'string' || !contact.email.trim() ||
    typeof contact?.message !== 'string' || !contact.message.trim()
  ) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Name, email, and message are required' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: 'Message received' }),
  };
}
