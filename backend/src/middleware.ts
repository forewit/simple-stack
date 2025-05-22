import { Context, Next } from 'hono';
import { verifyFirebaseToken, getOrCreateUserProfile } from './firebaseAdmin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { UserRole, type UserProfile } from 'shared'; // Uses 'shared' package

export type AppEnv = {
  Variables: {
    user: DecodedIdToken;
    userProfile: UserProfile;
  };
};

export const authMiddleware = async (c: Context<AppEnv>, next: Next) => { /* ... (same as pnpm version, ensure types from 'shared') ... */ };
export const adminGuard = async (c: Context<AppEnv>, next: Next) => { /* ... (same as pnpm version, ensure types from 'shared') ... */ };

// --- Implementation of middleware (copy from pnpm version, ensure types from 'shared') ---
export const authMiddleware_impl = async (c: Context<AppEnv>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }
  const token = authHeader.substring(7);

  const decodedToken = await verifyFirebaseToken(token);
  if (!decodedToken) {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
  }
  c.set('user', decodedToken);

  try {
    const userProfileData = await getOrCreateUserProfile(decodedToken.uid, {
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
    });
    c.set('userProfile', userProfileData);
  } catch (error) {
    console.error("Error fetching/creating user profile in middleware:", error);
    return c.json({ error: 'Failed to process user profile' }, 500);
  }
  await next();
};
authMiddleware = authMiddleware_impl;

export const adminGuard_impl = async (c: Context<AppEnv>, next: Next) => {
  const userProfile = c.get('userProfile'); // Assumes authMiddleware has run
  if (!userProfile || userProfile.role !== UserRole.ADMIN) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }
  await next();
};
adminGuard = adminGuard_impl;