const Stripe = require('stripe');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const siteUrl = (process.env.SITE_URL || 'https://nostosprogram.com').replace(/\/$/, '');

    if (!stripeKey || !priceId) {
      return json(500, { error: 'Missing Stripe configuration' });
    }

    const payload = JSON.parse(event.body || '{}');
    const email = String(payload.email || '').trim().toLowerCase();
    const fullName = String(payload.full_name || payload.fullName || payload.first_name || payload.firstName || '').trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return json(400, { error: 'Email invalide' });
    }

    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: `${siteUrl}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/annulation`,
      metadata: {
        full_name: fullName,
        source: 'nostosprogram.com'
      },
      payment_intent_data: {
        metadata: {
          full_name: fullName,
          source: 'nostosprogram.com',
          kit_sync_completed: 'false'
        }
      }
    });

    return json(200, { url: session.url, id: session.id });
  } catch (error) {
    return json(500, { error: error.message || 'Unable to create checkout session' });
  }
};
