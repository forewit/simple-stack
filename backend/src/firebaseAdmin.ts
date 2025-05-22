import admin from 'firebase-admin';
import { UserRole, type UserProfile } from 'shared'; // Uses 'shared' package
import dotenv from 'dotenv';

dotenv.config();

try {
  if (admin.apps.length === 0) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.error("Firebase Admin SDK credentials not found.");
    }
  }
} catch (error: any) {
    console.error("Firebase Admin SDK Initialization Error:", error.message);
}

export const auth = admin.auth();
export const firestore = admin.firestore();

export const verifyFirebaseToken = async (token: string) => { /* ... (same as pnpm version) ... */ };
export const getOrCreateUserProfile = async (uid: string, defaults: Partial<admin.auth.UserRecord> = {}): Promise<UserProfile> => { /* ... (same as pnpm version, ensure UserProfile type is from 'shared') ... */ };
export const updateUserRole = async (uid: string, newRole: UserRole) => { /* ... (same as pnpm version, ensure UserRole type is from 'shared') ... */ };

// --- Implementation of helper functions (copy from pnpm version, ensure types from 'shared') ---
// verifyFirebaseToken
export const verifyFirebaseToken_impl = async (token: string) => {
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
};
verifyFirebaseToken = verifyFirebaseToken_impl;


// getOrCreateUserProfile
export const getOrCreateUserProfile_impl = async (uid: string, defaults: Partial<admin.auth.UserRecord> = {}): Promise<UserProfile> => {
  const userDocRef = firestore.collection('users').doc(uid);
  let userDoc = await userDocRef.get();

  if (userDoc.exists) {
    return userDoc.data() as UserProfile;
  } else {
    let firebaseUserRecord;
    try {
        firebaseUserRecord = await auth.getUser(uid);
    } catch (error) {
        console.warn(`Could not fetch Firebase Auth user ${uid} for profile creation. Using defaults.`);
    }

    const newUserProfileData: UserProfile = {
      uid,
      email: firebaseUserRecord?.email || defaults.email || null,
      displayName: firebaseUserRecord?.displayName || defaults.displayName || null,
      photoURL: firebaseUserRecord?.photoURL || defaults.photoURL || null,
      role: UserRole.FREE,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userDocRef.set(newUserProfileData);
    userDoc = await userDocRef.get(); // Re-fetch to get server timestamp resolved
    return userDoc.data() as UserProfile;
  }
};
getOrCreateUserProfile = getOrCreateUserProfile_impl;

// updateUserRole
export const updateUserRole_impl = async (uid: string, newRole: UserRole) => {
  const userDocRef = firestore.collection('users').doc(uid);
  const updates: Partial<UserProfile> = { role: newRole };

  await userDocRef.update(updates);

  try {
    const userRecord = await auth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await auth.setCustomUserClaims(uid, { ...existingClaims, role: newRole });
    console.log(`User ${uid} role updated to ${newRole} in Firestore and custom claims set.`);
  } catch (error) {
    console.error(`Failed to set custom claims for user ${uid}:`, error);
  }
};
updateUserRole = updateUserRole_impl;

export { admin };