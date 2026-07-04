exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { name, email, message } = JSON.parse(event.body);

    if (!name || !email || !message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name, email, and message are required.' }) };
    }

    if (name.length > 100 || email.length > 200 || message.length > 5000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Input exceeds maximum length.' }) };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email address.' }) };
    }

    console.log('Contact form submission:', { name, email, message: message.substring(0, 100) });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Thanks! Your message has been received. I\'ll get back to you soon.' })
    };
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }
};
