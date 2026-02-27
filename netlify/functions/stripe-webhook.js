const Stripe = require('stripe');

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

async function kitRequest(path, payload) {
  const res = await fetch(`https://api.convertkit.com${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Kit API error (${res.status}) on ${path}: ${text}`);
  }

  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const kitApiKey = process.env.KIT_API_KEY;
  const kitApiSecret = process.env.KIT_API_SECRET;
  const kitSequenceId = process.env.KIT_SEQUENCE_ID;

  if (!stripeKey || !webhookSecret || !kitSequenceId || (!kitApiKey && !kitApiSecret)) {
    return response(500, { error: 'Missing webhook/KIT configuration' });
  }

  const stripe = new Stripe(stripeKey);
  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];

  if (!signature) {
    return response(400, { error: 'Missing Stripe signature' });
  }

  let stripeEvent;
  try {
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '', 'utf8');
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return response(400, { error: `Webhook signature verification failed: ${err.message}` });
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return response(200, { received: true, ignored: true, type: stripeEvent.type });
  }

  try {
    const session = stripeEvent.data.object;
    const email = (session.customer_details && session.customer_details.email) || session.customer_email;
    const firstName = (session.metadata && session.metadata.first_name) || '';
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

    if (!email) {
      throw new Error('Missing customer email in checkout.session.completed');
    }

    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.metadata && paymentIntent.metadata.kit_sync_completed === 'true') {
        return response(200, { received: true, idempotent: true });
      }
    }

    const kitAuth = {};
    if (kitApiKey) kitAuth.api_key = kitApiKey;
    if (kitApiSecret) kitAuth.api_secret = kitApiSecret;

    await kitRequest('/v3/subscribers', {
      ...kitAuth,
      email,
      first_name: firstName
    });

    await kitRequest(`/v3/sequences/${kitSequenceId}/subscribe`, {
      ...kitAuth,
      email,
      first_name: firstName
    });

    if (paymentIntentId) {
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          kit_sync_completed: 'true',
          kit_sequence_id: String(kitSequenceId)
        }
      });
    }

    return response(200, { received: true, processed: true });
  } catch (error) {
    return response(500, { error: error.message || 'Webhook processing failed' });
  }
};
