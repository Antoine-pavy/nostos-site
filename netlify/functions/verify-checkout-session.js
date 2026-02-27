const Stripe = require('stripe');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return json(500, { error: 'Missing STRIPE_SECRET_KEY' });
    }

    const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
    if (!sessionId) {
      return json(400, { error: 'Missing session_id' });
    }

    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const isPaid = session.payment_status === 'paid';
    if (!isPaid) {
      return json(403, { ok: false, error: 'Session not paid' });
    }

    return json(200, {
      ok: true,
      id: session.id,
      email: (session.customer_details && session.customer_details.email) || session.customer_email || null,
      first_name: (session.metadata && session.metadata.first_name) || '',
      amount_total: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
      currency: session.currency ? String(session.currency).toUpperCase() : 'EUR'
    });
  } catch (error) {
    return json(400, { ok: false, error: error.message || 'Invalid session' });
  }
};
