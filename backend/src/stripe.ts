import Stripe from 'stripe';
import dotenv from 'dotenv';
import { admin, firestore, updateUserRole } from './firebaseAdmin.js';
import { UserRole, type UserProfile } from 'shared'; // Uses 'shared' package

dotenv.config();

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
  typescript: true,
});

export const createCheckoutSession = async (uid: string, priceId: string, userEmail?: string) => {
  // Optionally, find or create a Stripe customer
  let customerId = (await admin.firestore().collection('users').doc(uid).get()).data()?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
        email: userEmail, // Pass user's email
        metadata: { firebaseUID: uid }
    });
    customerId = customer.id;
    await admin.firestore().collection('users').doc(uid).update({ stripeCustomerId: customerId });
  }


  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: customerId, // Use existing or newly created customer
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    // Important: metadata to link session to Firebase user
    metadata: {
      firebaseUID: uid,
    },
    success_url: `${process.env.APP_URL}/app?payment_success=true`, // Or a dedicated success page
    cancel_url: `${process.env.APP_URL}/app?payment_canceled=true`,
  });
  return session;
};

export const handleStripeWebhook = async (rawBody: any, signature: string) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed.`, err.message);
    throw new Error('Webhook signature verification failed');
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const firebaseUID = session.metadata?.firebaseUID;

  if (!firebaseUID) {
    console.error('Webhook Error: No firebaseUID in session metadata');
    return { received: true, error: 'Missing firebaseUID' };
  }

  switch (event.type) {
    case 'checkout.session.completed':
      console.log(`Checkout session completed for user ${firebaseUID}`);
      // User successfully subscribed.
      // The subscription object is not directly in checkout.session.completed
      // We need to retrieve the subscription if we need its ID immediately.
      // Usually, customer.subscription.created/updated is more reliable for role changes.
      if (session.payment_status === 'paid') {
         // Optionally ensure customer ID is stored
        if (session.customer && typeof session.customer === 'string') {
            await admin.firestore().collection('users').doc(firebaseUID).set({
                stripeCustomerId: session.customer,
                subscriptionStatus: 'active' // Tentative, confirm with subscription event
            }, { merge: true });
        }
        // We could optimistically update role here, but better to wait for subscription event
        // await updateUserRole(firebaseUID, UserRole.PREMIUM);
      }
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`Subscription ${event.type} for user ${firebaseUID}, status: ${subscription.status}`);
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        await updateUserRole(firebaseUID, UserRole.PREMIUM);
        await admin.firestore().collection('users').doc(firebaseUID).update({
          subscriptionStatus: subscription.status,
          stripeSubscriptionId: subscription.id,
        });
      } else {
        // e.g., 'canceled', 'past_due', 'unpaid'
        await updateUserRole(firebaseUID, UserRole.FREE);
        await admin.firestore().collection('users').doc(firebaseUID).update({
          subscriptionStatus: subscription.status,
        });
      }
      break;

    case 'customer.subscription.deleted': // Subscription ended
      const deletedSubscription = event.data.object as Stripe.Subscription;
      console.log(`Subscription deleted for user ${firebaseUID}`);
      await updateUserRole(firebaseUID, UserRole.FREE);
      await admin.firestore().collection('users').doc(firebaseUID).update({
        subscriptionStatus: deletedSubscription.status, // should be 'canceled'
      });
      break;

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
  return { received: true };
};

// Helper to get Stripe price ID from env
export const getPremiumPriceId = () => {
    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId) {
        throw new Error("STRIPE_PREMIUM_PRICE_ID is not set in environment variables.");
    }
    return priceId;
}