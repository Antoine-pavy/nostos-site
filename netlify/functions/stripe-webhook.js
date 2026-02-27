const Stripe = require('stripe');

const KIT_API_BASE = 'https://api.kit.com/v4';

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function getHeader(headers, key) {
  if (!headers) return null;
  const direct = headers[key];
  if (direct) return direct;
  const lowerKey = key.toLowerCase();
  const foundKey = Object.keys(headers).find((k) => k.toLowerCase() === lowerKey);
  return foundKey ? headers[foundKey] : null;
}

async function kitRequest(path, payload, kitApiKey) {
  const res = await fetch(`${KIT_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // V4 supports API keys; keep both headers for compatibility.
      'Authorization': `Bearer ${kitApiKey}`,
      'X-Kit-Api-Key': kitApiKey
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Kit API error (${res.status}) on ${path}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return { raw: text };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const kitApiKey = process.env.KIT_API_KEY;
  const kitSequenceId = process.env.KIT_SEQUENCE_ID;
  const kitTagId = process.env.KIT_TAG_ID;

  if (!stripeKey || !webhookSecret || !kitApiKey || (!kitSequenceId && !kitTagId)) {
    console.error('[stripe-webhook] Missing configuration variables');
    return response(500, { error: 'Missing webhook/KIT configuration' });
  }

  const signature = getHeader(event.headers, 'stripe-signature');
  if (!signature) {
    console.error('[stripe-webhook] Missing stripe-signature header');
    return response(400, { error: 'Missing Stripe signature' });
  }

  const stripe = new Stripe(stripeKey);
  const isBase64 = Boolean(event.isBase64Encoded);
  console.log(`[stripe-webhook] Incoming webhook. base64=${isBase64}`);

  let stripeEvent;
  try {
    const payload = isBase64 ? Buffer.from(event.body || '', 'base64') : (event.body || '');
    stripeEvent = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] constructEvent error:', err.message);
    return response(400, { error: `Webhook signature verification failed: ${err.message}` });
  }

  console.log(`[stripe-webhook] Event type: ${stripeEvent.type}`);

  if (stripeEvent.type !== 'checkout.session.completed') {
    return response(200, { received: true, ignored: true, type: stripeEvent.type });
  }

  try {
    const session = stripeEvent.data.object;
    const email = (session.customer_details && session.customer_details.email) || session.customer_email || '';
    const firstName = (session.metadata && session.metadata.first_name) || '';
    const objective = (session.metadata && session.metadata.objective) || '';

    if (!email) {
      throw new Error('Missing customer email in checkout.session.completed');
    }

    console.log(`[stripe-webhook] checkout.session.completed for ${email}`);

    const fields = {};
    if (objective) fields.objective = objective;

    await kitRequest('/subscribers', {
      email_address: email,
      first_name: firstName,
      fields
    }, kitApiKey);
    console.log('[stripe-webhook] Kit subscriber upsert done');

    if (kitSequenceId) {
      await kitRequest(`/sequences/${kitSequenceId}/subscribers`, {
        email_address: email
      }, kitApiKey);
      console.log(`[stripe-webhook] Kit sequence subscribed: ${kitSequenceId}`);
    }

    if (kitTagId) {
      await kitRequest(`/tags/${kitTagId}/subscribers`, {
        email_address: email
      }, kitApiKey);
      console.log(`[stripe-webhook] Kit tag applied: ${kitTagId}`);
    }

    return response(200, { received: true, processed: true });
  } catch (error) {
    console.error('[stripe-webhook] Processing error:', error.message);
    // Return 200 to avoid endless Stripe retries while logging the issue.
    return response(200, { received: true, processed: false });
  }
};
