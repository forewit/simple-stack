import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors'; 
import dotenv from 'dotenv'; 

// Import middleware and services
import { authMiddleware, adminGuard } from './middleware.js';
import { getOrCreateUserProfile, firestore, admin } from './firebaseAdmin.js'; // Ensure admin is exported and imported
import { createCheckoutSession, handleStripeWebhook, getPremiumPriceId } from './stripe.js';
import { type UserProfile } from 'shared';

dotenv.config();

const app = new Hono();

// CORS for local development (frontend on different port)
app.use('/api/*', cors({ origin: process.env.APP_URL || 'http://localhost:5173' }));
app.use('/webhook/*', cors()); // More open for webhooks if needed, or restrict to Stripe IPs

// --- API Routes ---
const api = new Hono();

// Protected route example: Get user profile
api.get('/user/profile', authMiddleware, async (c) => {
  let userProfile = c.get('userProfile');
  const firebaseUser = c.get('user'); // from decoded token

  if (!userProfile && firebaseUser) {
    // This case might happen if getOrCreateUserProfile failed or was skipped
    // and we only have the decoded token. Attempt to fetch/create again.
    userProfile = (await getOrCreateUserProfile(firebaseUser.uid, {
        email: firebaseUser.email,
        displayName: firebaseUser.name,
        photoURL: firebaseUser.picture
    })) as UserProfile;
  }

  if (!userProfile) {
      return c.json({ error: 'User profile not found or could not be created.' }, 404);
  }
  return c.json(userProfile);
});

// Stripe Checkout Session
api.post('/stripe/create-checkout-session', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'User not authenticated' }, 401);

  try {
    // const { priceId } = await c.req.json(); // If you want to pass priceId from frontend
    const priceId = getPremiumPriceId(); // Or get it from env
    if (!priceId) return c.json({ error: 'Price ID not configured' }, 500);

    const session = await createCheckoutSession(user.uid, priceId, user.email);
    return c.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return c.json({ error: error.message || 'Failed to create checkout session' }, 500);
  }
});

// Admin Route Example
const adminRoutes = new Hono();
adminRoutes.use('*', authMiddleware, adminGuard); // Protect all admin routes

adminRoutes.get('/users', async (c) => {
  try {
    const listUsersResult = await admin.auth().listUsers(100); // Get up to 100 users
    const usersPromises = listUsersResult.users.map(async (userRecord) => {
      // Fetch profile from Firestore to get the role
      const profile = await getOrCreateUserProfile(userRecord.uid, userRecord) as UserProfile;
      return profile;
    });
    const usersWithRoles = await Promise.all(usersPromises);
    return c.json(usersWithRoles);
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});
api.route('/admin', adminRoutes); // Mount admin routes under /api/admin

app.route('/api', api); // Mount all API routes

// Stripe Webhook
// Important: Stripe needs a raw body, so Hono's body parsing must not run first.
// Place this route before any general body parsing middleware if you add one.
app.post('/webhook/stripe', async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    if (!signature) return c.text('Missing stripe-signature header', 400);

    const rawBody = await c.req.text(); // Get raw body as text
    await handleStripeWebhook(rawBody, signature);
    return c.json({ received: true });
  } catch (error: any) {
    console.error('Stripe Webhook Error:', error.message);
    return c.text(`Webhook Error: ${error.message}`, 400);
  }
});


// --- Static File Serving for Svelte App ---
// Serve static files from the root /dist directory
app.use('/*', serveStatic({ root: '../dist' }));
// SPA fallback: for any route not matched by API or static files, serve index.html
app.get('/*', serveStatic({ path: '../dist/index.html' }));


const port = parseInt(process.env.PORT || '3000');
console.log(`Backend server running on http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port: port,
});