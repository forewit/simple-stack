import Stripe from 'stripe';
import dotenv from 'dotenv';
import { admin, firestore, updateUserRole } from './firebaseAdmin';
import { UserRole, type UserProfile } from 'shared'; // Uses 'shared' package

dotenv.config();
// ... (rest of the Stripe logic, same as pnpm version, ensure UserRole/UserProfile from 'shared')
// Ensure STRIPE_SECRET_KEY check and Stripe instance initialization are correct.
// Ensure getPremiumPriceId, createCheckoutSession, handleStripeWebhook are correct.

// --- Implementation (copy from pnpm version, ensure types from 'shared') ---
if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not defined in .env file.");
}
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export let getPremiumPriceId = (): string => { /* ... */ };
export let createCheckoutSession = async (uid: string, userEmail?: string) => { /* ... */ };
export let handleStripeWebhook = async (rawBody: Buffer | string, signature: string) => { /* ... */ };

export const getPremiumPriceId_impl = (): string => {
    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId) {
        console.error("STRIPE_PREMIUM_PRICE_ID is not set in environment variables.");
        throw new Error("Stripe premium price ID not configured.");
    }
    return priceId;
};
getPremiumPriceId = getPremiumPriceId_impl;

export const createCheckoutSession_impl = async (uid: string, userEmail?: string) => {
  const priceId = getPremiumPriceId();
  const userDocRef = firestore.collection('users').doc(uid);
  const userDoc = await userDocRef.get();
  let stripeCustomerId = userDoc.data()?.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { firebaseUID: uid }
    });
    stripeCustomerId = customer.id;
    await userDocRef.set({ stripeCustomerId }, { merge: true });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [ { price: priceId, quantity: 1 } ],
    metadata: { firebaseUID: uid },
    success_url: `${process.env.APP_URL}/app?payment_success=true`,
    cancel_url: `${process.env.APP_URL}/app?payment_canceled=true`,
  });
  return session;
};
createCheckoutSession = createCheckoutSession_impl;

export const handleStripeWebhook_impl = async (rawBody: Buffer | string, signature: string) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed.`, err.message);
    throw new Error('Webhook signature verification failed');
  }

  const dataObject = event.data.object as any;
  let firebaseUID = dataObject.metadata?.firebaseUID;

  if (!firebaseUID && dataObject.customer) {
    // Attempt to find Firebase UID from Stripe Customer ID if metadata is missing
    const usersSnap = await firestore.collection('users').where('stripeCustomerId', '==', dataObject.customer).limit(1).get();
    if (!usersSnap.empty) {
        firebaseUID = usersSnap.docs[0].id;
    }
  }

  if (!firebaseUID) {
    console.error('Webhook Error: No firebaseUID found for event.', event.type, dataObject.id);
    if (event.type.startsWith('customer.subscription.')) {
         return { received: true, error: 'Missing firebaseUID for critical subscription event' };
    }
    return { received: true, message: 'No Firebase UID, event not processed for user update.' };
  }

  const userDocRef = firestore.collection('users').doc(firebaseUID);

  switch (event.type) {
    case 'checkout.session.completed':
      // ... (same logic as pnpm version)
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      // ... (same logic as pnpm version, ensure UserRole comes from 'shared')
      break;
    case 'customer.subscription.deleted':
      // ... (same logic as pnpm version, ensure UserRole comes from 'shared')
      break;
    default:
      console.log(`Unhandled Stripe webhook event type: ${event.type}`);
  }
  return { received: true };
};
handleStripeWebhook = handleStripeWebhook_impl;
