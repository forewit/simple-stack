import { Context, Next } from 'hono';
import { verifyFirebaseToken, getOrCreateUserProfile } from './firebaseAdmin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { UserRole, type UserProfile } from 'shared'; // Uses 'shared' package

// Define a type for the context variable
type AppContext = {
  Variables: {
    user: DecodedIdToken | null; // Firebase user from token
    userProfile: UserProfile | null; // User profile from Firestore
  };
};

export const authMiddleware = async (c: Context<AppContext>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }
  const token = authHeader.substring(7); // "Bearer ".length

  const decodedToken = await verifyFirebaseToken(token);
  if (!decodedToken) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }

  c.set('user', decodedToken);

  // Fetch or create user profile from Firestore
  // This ensures we have the role from Firestore, not just potential (stale) custom claims initially
  const userProfileData = await getOrCreateUserProfile(decodedToken.uid, {
    email: decodedToken.email,
    displayName: decodedToken.name, // 'name' from decodedToken often maps to displayName
    photoURL: decodedToken.picture, // 'picture' from decodedToken often maps to photoURL
  }) as UserProfile;

  c.set('userProfile', userProfileData);

  await next();
};

export const adminGuard = async (c: Context<AppContext>, next: Next) => {
  const userProfile = c.get('userProfile');
  if (!userProfile || userProfile.role !== UserRole.ADMIN) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }
  await next();
};