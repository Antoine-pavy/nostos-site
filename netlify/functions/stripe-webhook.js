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
  const wanted = key.toLowerCase();
  const found = Object.keys(headers).find((k) => k.toLowerCase() === wanted);
  return found ? headers[found] : null;
}

async function kitPost(path, payload, kitApiKey) {
  const res = await fetch(`${KIT_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': kitApiKey
    },
    body: JSON.stringify(payload)
  });

  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (e) {
    data = { raw };
  }

  return { ok: res.ok, status: res.status, data, raw };
}

function isSubscriberAlreadyExists(result) {
  const text = (result && (result.raw || JSON.stringify(result.data) || '')).toLowerCase();
  return text.includes('already exists') || text.includes('has already been taken') || text.includes('email_address');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const kitApiKey = process.env.KIT_API_KEY;
  const kitTagId = process.env.KIT_TAG_ID;

  const missing = [];
  if (!stripeKey) missing.push('STRIPE_SECRET_KEY');
  if (!webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET');
  if (!kitApiKey) missing.push('KIT_API_KEY');
  if (!kitTagId) missing.push('KIT_TAG_ID');

  if (missing.length > 0) {
    console.error('[stripe-webhook] Missing required env vars:', missing.join(', '));
    return response(500, { error: 'Missing webhook/KIT configuration', missing });
  }

  const signature = getHeader(event.headers, 'stripe-signature');
  if (!signature) {
    console.error('[stripe-webhook] Missing stripe-signature header');
    return response(400, { error: 'Missing Stripe signature' });
  }

  const stripe = new Stripe(stripeKey);
  const isBase64 = Boolean(event.isBase64Encoded);
  console.log(`[stripe-webhook] Incoming webhook payload. base64=${isBase64}`);

  let stripeEvent;
  try {
    const payload = isBase64 ? Buffer.from(event.body || '', 'base64') : (event.body || '');
    stripeEvent = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] constructEvent error:', err.message);
    return response(400, { error: `Webhook signature verification failed: ${err.message}` });
  }

  console.log(`Stripe event received: ${stripeEvent.type}`);

  if (stripeEvent.type !== 'checkout.session.completed') {
    return response(200, { received: true, ignored: true, type: stripeEvent.type });
  }

  try {
    const session = stripeEvent.data.object;
    const email = (session.customer_details && session.customer_details.email) || session.customer_email || '';
    const fullName = (session.metadata && (session.metadata.full_name || session.metadata.first_name)) || '';

    if (!email) {
      console.error('[stripe-webhook] checkout.session.completed missing email');
      return response(200, { received: true, processed: false, error: 'missing_email' });
    }

    console.log(`Creating/Upserting Kit subscriber: ${email}`);

    const createResult = await kitPost('/subscribers', {
      email_address: email,
      first_name: fullName
    }, kitApiKey);

    if (!(createResult.status === 200 || createResult.status === 201)) {
      if (isSubscriberAlreadyExists(createResult)) {
        console.log(`[stripe-webhook] Subscriber already exists: ${email}`);
      } else {
        console.error('[stripe-webhook] Kit create subscriber error:', {
          status: createResult.status,
          body: createResult.raw
        });
        return response(200, { received: true, processed: false });
      }
    }

    console.log(`Tagging subscriber with tag ${kitTagId}`);

    const tagResult = await kitPost(`/tags/${kitTagId}/subscribers`, {
      email_address: email
    }, kitApiKey);

    if (!(tagResult.status === 200 || tagResult.status === 201)) {
      console.error('[stripe-webhook] Kit tag subscriber error:', {
        status: tagResult.status,
        body: tagResult.raw
      });
      return response(200, { received: true, processed: false });
    }

    return response(200, { received: true, processed: true });
  } catch (error) {
    console.error('[stripe-webhook] Processing error:', error);
    return response(200, { received: true, processed: false });
  }
};
