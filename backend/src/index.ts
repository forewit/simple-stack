import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import dotenv from 'dotenv';

import { authMiddleware, adminGuard, type AppEnv } from './middleware';
import { admin, getOrCreateUserProfile } from './firebaseAdmin';
import { createCheckoutSession, handleStripeWebhook } from './stripe';
// UserProfile type not directly needed here unless constructing one

dotenv.config();

const app = new Hono<AppEnv>();

// CORS (same as pnpm version)
app.use('/api/*', cors({ origin: process.env.APP_URL || 'http://localhost:5173', /* ... */ }));
app.use('/webhook/stripe', cors({ origin: '*' }));


// --- API Routes (same as pnpm version) ---
const apiRoutes = new Hono<AppEnv>();
apiRoutes.get('/user/profile', authMiddleware, async (c) => { /* ... */ });
apiRoutes.post('/stripe/create-checkout-session', authMiddleware, async (c) => { /* ... */ });

const adminApiRoutes = new Hono<AppEnv>();
adminApiRoutes.use('*', authMiddleware, adminGuard);
adminApiRoutes.get('/users', async (c) => { /* ... */ });
apiRoutes.route('/admin', adminApiRoutes);

app.route('/api', apiRoutes);

// Stripe Webhook (same as pnpm version, ensure rawBody handling)
app.post('/webhook/stripe', async (c) => {
    try {
        const signature = c.req.header('stripe-signature');
        if (!signature) return c.text('Missing stripe-signature header', 400);
        const rawBody = await c.req.raw.arrayBuffer(); // Hono specific for raw body
        await handleStripeWebhook(Buffer.from(rawBody), signature);
        return c.json({ received: true });
    } catch (error: any) {
        console.error('Stripe Webhook Error:', error.message);
        return c.text(`Webhook Error: ${error.message}`, 400);
    }
});

// Static File Serving (same as pnpm version)
app.use('/*', serveStatic({ root: '../dist' }));
app.get('/*', serveStatic({ path: '../dist/index.html' }));

const port = parseInt(process.env.PORT || '3000');
console.log(`Backend server starting on http://localhost:${port}`);
serve({ fetch: app.fetch, port: port });