import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { writable } from 'svelte/store';
import { type UserProfile, UserRole } from 'shared';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_APIKEY,
  authDomain: import.meta.env.VITE_AUTHDOMAIN,
  projectId: import.meta.env.VITE_PROJECTID,
  storageBucket: import.meta.env.VITE_STORAGEBUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGINGSENDERID,
  appId: import.meta.env.VITE_APPID,
};

let app: FirebaseApp;
try {
    app = initializeApp(firebaseConfig);
} catch (e) {
    console.error("Failed to initialize Firebase App", e);
    // Consider a more user-friendly error display
}

export const auth = getAuth(app!);

interface AuthState {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: Error | null;
}

const initialAuthState: AuthState = { firebaseUser: null, userProfile: null, loading: true, error: null };
export const authStore = writable<AuthState>(initialAuthState);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    authStore.set({ firebaseUser: user, userProfile: null, loading: true, error: null });
    try {
      const token = await user.getIdToken(true); // Force refresh for custom claims
      const response = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error from profile fetch' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      const profileData: UserProfile = await response.json();
      authStore.set({ firebaseUser: user, userProfile: profileData, loading: false, error: null });

    } catch (error: any) {
      console.error("Error fetching/setting user profile:", error);
      authStore.set({
        firebaseUser: user,
        userProfile: { // Minimal local profile as fallback
            uid: user.uid, email: user.email, displayName: user.displayName,
            photoURL: user.photoURL, role: UserRole.FREE,
        },
        loading: false, error
      });
    }
  } else {
    authStore.set({ firebaseUser: null, userProfile: null, loading: false, error: null });
  }
});

export const isAdmin = (profile: UserProfile | null): boolean => profile?.role === UserRole.ADMIN;
export const isPremium = (profile: UserProfile | null): boolean => profile?.role === UserRole.PREMIUM;