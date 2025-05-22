import admin from 'firebase-admin';
import { UserRole, type UserProfile } from 'shared';
import dotenv from 'dotenv'; 


dotenv.config();

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
     console.log("Firebase Admin initialized with service account file.");
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin initialized with environment variables.");
  } else {
    throw new Error("Firebase Admin SDK credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.");
  }
} catch (error: any) {
    console.error("Firebase Admin SDK Initialization Error:", error.message);
    // You might want to exit the process if Firebase Admin can't initialize
    // process.exit(1);
}


export const auth = admin.auth();
export const firestore = admin.firestore();

export const verifyFirebaseToken = async (token: string) => {
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
};

// Helper to get or create user profile in Firestore
export const getOrCreateUserProfile = async (uid: string, defaults: Partial<admin.auth.UserRecord> = {}) => {
  const userDocRef = firestore.collection('users').doc(uid);
  const userDoc = await userDocRef.get();

  if (userDoc.exists) {
    return userDoc.data();
  } else {
    const firebaseUser = await auth.getUser(uid).catch(() => null);
    const newUserProfile = {
      uid,
      email: firebaseUser?.email || defaults.email || null,
      displayName: firebaseUser?.displayName || defaults.displayName || null,
      photoURL: firebaseUser?.photoURL || defaults.photoURL || null,
      role: UserRole.FREE, // Default role
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userDocRef.set(newUserProfile);
    return newUserProfile;
  }
};

// Function to update user role and set custom claims
export const updateUserRole = async (uid: string, newRole: UserRole) => {
  // 1. Update Firestore
  const userDocRef = firestore.collection('users').doc(uid);
  await userDocRef.update({ role: newRole });

  // 2. Set Custom Claims
  // Make sure to include existing claims if any, or manage them carefully
  const existingClaims = (await auth.getUser(uid)).customClaims || {};
  await auth.setCustomUserClaims(uid, { ...existingClaims, role: newRole });
  console.log(`User ${uid} role updated to ${newRole} and custom claim set.`);
};

export { admin };