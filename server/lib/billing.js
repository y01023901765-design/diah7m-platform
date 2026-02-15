/**
 * DIAH-7M Billing Service v1.0
 * Stripe 구독/결제/웹훅/포탈
 * 4티어: FREE($0) / BASIC($9.9) / PRO($29.9) / PREMIUM($99.9)
 */
const PLANS = {
  FREE:    { id: 'free',    name: 'Free',    price: 0,     stripePriceId: null },
  BASIC:   { id: 'basic',   name: 'Basic',   price: 9.90,  stripePriceId: process.env.STRIPE_PRICE_BASIC || '' },
  PRO:     { id: 'pro',     name: 'Pro',     price: 29.90, stripePriceId: process.env.STRIPE_PRICE_PRO || '' },
  PREMIUM: { id: 'premium', name: 'Premium', price: 99.90, stripePriceId: process.env.STRIPE_PRICE_PREMIUM || '' },
};

let stripe = null;
try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'); } catch(e) {}

async function createCheckout(userId, planId, successUrl, cancelUrl) {
  if (!stripe) throw new Error('Stripe not configured');
  const plan = PLANS[planId?.toUpperCase()];
  if (!plan || !plan.stripePriceId) throw new Error(`Invalid plan: ${planId}`);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: successUrl || `${process.env.BASE_URL}/payment-success`,
    cancel_url: cancelUrl || `${process.env.BASE_URL}/payment-cancel`,
    metadata: { userId, planId: plan.id },
  });
  return session;
}

async function createPortalSession(stripeCustomerId) {
  if (!stripe) throw new Error('Stripe not configured');
  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.BASE_URL}/mypage`,
  });
}

async function handleWebhook(rawBody, signature) {
  if (!stripe) throw new Error('Stripe not configured');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  const handlers = {
    'checkout.session.completed': async (data) => ({ type: 'checkout_complete', userId: data.metadata.userId, planId: data.metadata.planId, customerId: data.customer, subscriptionId: data.subscription }),
    'customer.subscription.updated': async (data) => ({ type: 'subscription_updated', subscriptionId: data.id, status: data.status }),
    'customer.subscription.deleted': async (data) => ({ type: 'subscription_deleted', subscriptionId: data.id }),
    'invoice.payment_failed': async (data) => ({ type: 'payment_failed', customerId: data.customer, invoiceId: data.id }),
  };
  const handler = handlers[event.type];
  return handler ? await handler(event.data.object) : { type: 'ignored', eventType: event.type };
}

async function cancelSubscription(subscriptionId) {
  if (!stripe) throw new Error('Stripe not configured');
  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

function getPlan(planId) { return PLANS[planId?.toUpperCase()] || PLANS.FREE; }
function getAllPlans() { return Object.values(PLANS); }

module.exports = { PLANS, createCheckout, createPortalSession, handleWebhook, cancelSubscription, getPlan, getAllPlans };
