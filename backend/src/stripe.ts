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
  let customerJustCreated = false;

  if (!customerId) {
    const customer = await stripe.customers.create({
        email: userEmail, // Pass user's email
        metadata: { firebaseUID: uid }
    });
    customerId = customer.id;
    await admin.firestore().collection('users').doc(uid).update({ stripeCustomerId: customerId });
    customerJustCreated = true;
    console.log(`Created new Stripe customer ${customerId} for Firebase UID ${uid}`);
  } else {
    console.log(`Using existing Stripe customer ${customerId} for Firebase UID ${uid}`);
    // For existing customers, ensure their metadata in Stripe is up-to-date.
    // This makes the customer metadata fallback in webhooks more reliable.
    if (!customerJustCreated) {
        try {
            const existingCustomer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            if (existingCustomer && !existingCustomer.deleted) {
                if (!existingCustomer.metadata || existingCustomer.metadata.firebaseUID !== uid) {
                    console.log(`Updating metadata for existing Stripe customer ${customerId} to ensure firebaseUID ${uid}`);
                    await stripe.customers.update(customerId, {
                        metadata: { ...existingCustomer.metadata, firebaseUID: uid }
                    });
                }
            }
        } catch (error: any) {
            console.warn(`Could not retrieve or update existing customer ${customerId} to ensure firebaseUID: ${error.message}`);
            // Proceed, relying on session metadata primarily
        }
    }
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

  const dataObject = event.data.object as any; // Use a general type first
  let firebaseUID: string | undefined | null = null;

  console.log(`Webhook event received: Type: ${event.type}, Object type: ${dataObject.object}`);
  if (dataObject.metadata) {
    console.log("Webhook event data.object.metadata:", JSON.stringify(dataObject.metadata, null, 2));
    firebaseUID = dataObject.metadata.firebaseUID;
  } else {
    console.log("Webhook event data.object has no metadata field.");
  }

  // Fallback: If firebaseUID is not directly on the event object's metadata (e.g., subscription),
  // try to get it from the associated customer's metadata.
  if (!firebaseUID && (dataObject.object === 'subscription' || dataObject.object === 'invoice')) {
    const customerIdField = dataObject.customer;
    if (typeof customerIdField === 'string') {
      try {
        console.log(`Attempting to retrieve customer ${customerIdField} to find firebaseUID for event object ${dataObject.id} (type: ${dataObject.object})`);
        const customer = await stripe.customers.retrieve(customerIdField) as Stripe.Customer;
        if (customer && !customer.deleted && customer.metadata) {
          console.log(`Customer ${customer.id} metadata:`, JSON.stringify(customer.metadata, null, 2));
          firebaseUID = customer.metadata.firebaseUID;
          if (firebaseUID) {
            console.log(`Found firebaseUID (${firebaseUID}) in customer metadata for customer ${customer.id}.`);
          } else {
            console.log(`firebaseUID not found in customer metadata for ${customer.id}.`);
          }
        } else if (customer && customer.deleted) {
          console.log(`Customer ${customerIdField} is deleted.`);
        } else if (customer && !customer.metadata) {
          console.log(`Customer ${customerIdField} has no metadata field.`);
        }
      } catch (customerError: any) {
        console.error(`Error retrieving customer ${customerIdField} for event object ${dataObject.id}:`, customerError.message);
      }
    }
  }

  if (!firebaseUID) {
    console.error(`Webhook Error: Critical - firebaseUID could not be determined. Event Type: ${event.type}, Object Type: ${dataObject.object}. Full event data logged if available.`);
    console.log("Full event data object that lacked firebaseUID:", JSON.stringify(dataObject, null, 2));
    return { received: true, error: 'Missing or could not determine firebaseUID' };
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const completedSession = dataObject as Stripe.Checkout.Session;
      console.log(`Checkout session completed for user ${firebaseUID}`);
      // User successfully subscribed.
      // The subscription object is not directly in checkout.session.completed
      // Usually, customer.subscription.created/updated is more reliable for role changes.
      if (completedSession.payment_status === 'paid') {
         // Optionally ensure customer ID is stored
        if (completedSession.customer && typeof completedSession.customer === 'string') {
            await admin.firestore().collection('users').doc(firebaseUID).set({
                stripeCustomerId: completedSession.customer,
                subscriptionStatus: 'active' // Tentative, confirm with subscription event
            }, { merge: true });
        }
        // We could optimistically update role here, but better to wait for subscription event
        // await updateUserRole(firebaseUID, UserRole.PREMIUM);
      }
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = dataObject as Stripe.Subscription;
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
      const deletedSubscription = dataObject as Stripe.Subscription;
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