# Simple SaaS Monorepo Boilerplate (Svelte + Hono + Firebase + Stripe) - NPM Version

This guide provides a boilerplate structure and code for a simple SaaS application using:

*   **Frontend:** Svelte (with Vite, not SvelteKit)
*   **Backend:** Hono (Edge/Serverless friendly API)
*   **Shared:** TypeScript types/constants
*   **Authentication:** Firebase Auth
*   **Database:** Firestore
*   **Payments:** Stripe
*   **Build Output:** Svelte app built to `/dist`, served by Hono.

**Features:**
*   Public home page.
*   Authenticated `/app` page with role-based features.
*   Admin page for user/data viewing.

---

## I. Project Setup (using npm workspaces)

1.  **Create Project Directory:**
    ```bash
    mkdir my-saas-app
    cd my-saas-app
    ```

2.  **Root `package.json`:**
    Initialize npm and configure workspaces by creating `/package.json`:
    ```json
    {
      "name": "my-saas-monorepo",
      "private": true,
      "workspaces": [
        "frontend",
        "backend",
        "shared"
      ],
      "scripts": {
        "dev:frontend": "npm run dev -w frontend",
        "dev:backend": "npm run dev -w backend",
        "dev:shared": "npm run dev -w shared",
        "build:frontend": "npm run build -w frontend",
        "build:backend": "npm run build -w backend",
        "build:shared": "npm run build -w shared",
        "start:backend": "npm run start -w backend",
        "lint": "echo \"Run linting for each workspace individually\""
        // To run all dev scripts concurrently, you could use a tool like npm-run-all
        // "dev": "npm-run-all --parallel dev:frontend dev:backend dev:shared"
        // (requires: npm install -D npm-run-all@latest)
      },
      "devDependencies": {
        "typescript": "^5.0.0" // Or specific latest version
      }
    }
    ```
    *Run `npm install` in the root directory after creating this file to link workspaces.*

3.  **Create Package Directories:**
    ```bash
    mkdir frontend backend shared dist
    ```

4.  **Initialize each package:**

    *   **Shared:**
        ```bash
        cd shared
        npm init -y
        npm install -D typescript@latest
        cd ..
        ```
        Update `/shared/package.json` (see Section II).

    *   **Frontend:**
        ```bash
        cd frontend
        npm init -y
        npm install svelte-routing@latest firebase@latest
        npm install -D svelte@latest vite@latest @vitejs/plugin-svelte@latest typescript@latest
        cd ..
        ```
        Update `/frontend/package.json` (see Section III).

    *   **Backend:**
        ```bash
        cd backend
        npm init -y
        npm install hono@latest firebase-admin@latest stripe@latest dotenv@latest
        npm install -D @hono/node-server@latest @types/node@latest typescript@latest ts-node-dev@latest
        cd ..
        ```
        Update `/backend/package.json` (see Section IV).

    *After initializing each package, run `npm install` in the monorepo root again to ensure workspace dependencies (like `shared`) are correctly linked.*

---

## II. Shared Package (`/shared`)

This package will hold types and constants shared between the frontend and backend.

1.  **`shared/package.json`:**
    Update `/shared/package.json`:
    ```json
    {
      "name": "shared",
      "version": "1.0.0",
      "description": "Shared types and constants",
      "main": "dist/index.js",
      "types": "dist/index.d.ts",
      "scripts": {
        "build": "tsc",
        "dev": "tsc -w",
        "test": "echo \"Error: no test specified\" && exit 1"
      },
      "keywords": [],
      "author": "",
      "license": "ISC",
      "devDependencies": {
        "typescript": "^5.3.3" // Or your preferred latest version
      }
    }
    ```

2.  **`shared/tsconfig.json`:**
    Create `/shared/tsconfig.json`:
    ```json
    {
      "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "declaration": true,
        "outDir": "./dist",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "moduleResolution": "node" // Or "bundler"
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules", "dist"]
    }
    ```

3.  **`shared/src/types.ts`:**
    Create `/shared/src/types.ts`:
    ```typescript
    export enum UserRole {
      FREE = 'free',
      PREMIUM = 'premium',
      ADMIN = 'admin',
    }

    export interface UserProfile {
      uid: string;
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
      role: UserRole;
      stripeCustomerId?: string;
      subscriptionStatus?: string; // e.g., 'active', 'canceled', 'past_due'
      stripeSubscriptionId?: string;
      createdAt?: any; // Firebase ServerTimestamp or Date
    }

    export interface ApiResponse<T = any> {
      success: boolean;
      data?: T;
      error?: string;
    }
    ```

4.  **`shared/src/index.ts` (Entry point for exports):**
    Create `/shared/src/index.ts`:
    ```typescript
    export * from './types';
    ```
    *Run `npm run build -w shared` once, or `npm run dev -w shared` in a separate terminal to continuously build.*

---

## III. Frontend (`/frontend`) Svelte + Vite

1.  **`frontend/package.json`:**
    Update `/frontend/package.json` (merge with defaults from `npm init -y`):
    ```json
    {
      "name": "frontend",
      "private": true,
      "version": "0.0.0",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview",
        "lint": "echo 'Frontend lint placeholder'"
      },
      "dependencies": {
        "firebase": "^10.7.0", // Use specific latest or ^
        "svelte-routing": "^2.11.0",
        "shared": "*" // Uses npm workspace version
      },
      "devDependencies": {
        "@sveltejs/vite-plugin-svelte": "^3.0.1",
        "svelte": "^4.2.8",
        "typescript": "^5.3.3",
        "vite": "^5.0.10"
      }
    }
    ```

2.  **`frontend/vite.config.ts`:**
    Create `/frontend/vite.config.ts`:
    ```typescript
    import { defineConfig } from 'vite';
    import { svelte } from '@sveltejs/plugin-svelte';

    export default defineConfig({
      plugins: [svelte()],
      build: {
        outDir: '../dist', // Output to the root /dist
        emptyOutDir: true,   // Clear /dist before building
      },
      server: {
        port: 5173, // Default Vite port
        proxy: {
          '/api': {
            target: 'http://localhost:3000', // Your Hono backend port
            changeOrigin: true,
          },
          '/webhook': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          }
        }
      }
    });
    ```

3.  **`frontend/tsconfig.json`:**
    Create `/frontend/tsconfig.json`:
    ```json
    {
      "extends": "@tsconfig/svelte/tsconfig.json",
      "compilerOptions": {
        "target": "ESNext",
        "useDefineForClassFields": true,
        "module": "ESNext",
        "resolveJsonModule": true,
        "allowJs": true,
        "checkJs": true,
        "isolatedModules": true,
        "moduleResolution": "bundler",
        "baseUrl": ".", // Important for path aliases
        "paths": {
          "shared": ["../shared/src"] // For editor intellisense to src
        }
      },
      "include": ["src/**/*.d.ts", "src/**/*.ts", "src/**/*.js", "src/**/*.svelte"],
      "references": [{ "path": "./tsconfig.node.json" }]
    }
    ```

4.  **`frontend/tsconfig.node.json` (for Vite config):**
    Create `/frontend/tsconfig.node.json`:
    ```json
    {
      "compilerOptions": {
        "composite": true,
        "skipLibCheck": true,
        "module": "ESNext",
        "moduleResolution": "bundler",
        "allowSyntheticDefaultImports": true
      },
      "include": ["vite.config.ts"]
    }
    ```

5.  **`frontend/src/main.ts`:**
    Create `/frontend/src/main.ts`:
    ```typescript
    import './app.css';
    import App from './App.svelte';

    const app = new App({
      target: document.getElementById('app')!,
    });

    export default app;
    ```

6.  **`frontend/src/app.css` (Minimal):**
    Create `/frontend/src/app.css`:
    ```css
    body { font-family: sans-serif; margin: 0; }
    nav { background: #f0f0f0; padding: 1em; margin-bottom: 1em; display: flex; gap: 1em; align-items: center; }
    nav a, nav button { text-decoration: none; color: blue; background: none; border: none; cursor: pointer; font-size: 1em; }
    nav button:hover, nav a:hover { text-decoration: underline; }
    h1 { margin-top: 0; }
    .container { padding: 1em; }
    ```

7.  **`frontend/index.html`:**
    Update `/frontend/index.html`:
    ```html
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My SaaS App</title>
      </head>
      <body>
        <div id="app"></div>
        <script type="module" src="/src/main.ts"></script>
      </body>
    </html>
    ```

8.  **`frontend/src/lib/firebase.ts`:**
    Create `/frontend/src/lib/firebase.ts`:
    ```typescript
    import { initializeApp, type FirebaseApp } from 'firebase/app';
    import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
    import { writable } from 'svelte/store';
    import { type UserProfile, UserRole } from 'shared'; // Uses 'shared' package

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
    ```
    *Create `.env` in `/frontend` with your `VITE_FIREBASE_...` variables.*
    Example `/frontend/.env`:
    ```env
    VITE_FIREBASE_API_KEY=AIzaSy...
    VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your-project-id
    # ... and other Firebase config vars
    ```

9.  **`frontend/src/App.svelte` (Router & Nav):**
    Create `/frontend/src/App.svelte`:
    ```html
    <script lang="ts">
      import { Router, Route, link } from 'svelte-routing';
      import { authStore, auth } from './lib/firebase';
      import { signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
      import Home from './routes/Home.svelte';
      import AppView from './routes/AppView.svelte';
      import AdminView from './routes/AdminView.svelte';
      import SignIn from './routes/SignIn.svelte';
      import ProtectedRoute from './components/ProtectedRoute.svelte';
      import { UserRole } from 'shared'; // Uses 'shared' package

      const handleSignOut = async () => {
        try {
          await signOut(auth);
        } catch (error) {
          console.error("Sign out error", error);
        }
      };
    </script>

    <Router>
      <nav>
        <a href="/" use:link>Home</a>
        {#if $authStore.firebaseUser}
          <a href="/app" use:link>App</a>
          {#if $authStore.userProfile?.role === UserRole.ADMIN}
            <a href="/admin" use:link>Admin</a>
          {/if}
          <button on:click={handleSignOut}>Sign Out ({$authStore.userProfile?.email || 'User'})</button>
        {:else}
          <a href="/signin" use:link>Sign In</a>
        {/if}
      </nav>

      <div class="container">
        {#if $authStore.loading}
          <p>Loading authentication...</p>
        {:else if $authStore.error}
          <p style="color: red;">Authentication Error: {$authStore.error.message}. Try refreshing.</p>
        {:else}
          <Route path="/" component={Home} />
          <Route path="/signin" component={SignIn} />

          <ProtectedRoute path="/app" allowedRoles={[UserRole.FREE, UserRole.PREMIUM, UserRole.ADMIN]}>
            <AppView />
          </ProtectedRoute>

          <ProtectedRoute path="/admin" allowedRoles={[UserRole.ADMIN]}>
            <AdminView />
          </ProtectedRoute>
        {/if}
      </div>
    </Router>
    ```

10. **`frontend/src/components/ProtectedRoute.svelte`:**
    Create `/frontend/src/components/ProtectedRoute.svelte`:
    ```html
    <script lang="ts">
      import { Route, navigate } from 'svelte-routing';
      import { authStore } from '../lib/firebase';
      import { UserRole } from 'shared'; // Uses 'shared' package
      import { tick } from 'svelte';

      export let path: string;
      export let allowedRoles: UserRole[] = [];

      let isAuthorized = false;

      authStore.subscribe(async authState => {
        await tick(); // Ensure DOM updates before navigation decision

        if (authState.loading) {
          isAuthorized = false;
          return;
        }

        if (!authState.firebaseUser) {
          isAuthorized = false;
          if (window.location.pathname.startsWith(path)) { // Only navigate if currently on this protected path
            navigate('/signin', { replace: true });
          }
        } else if (authState.userProfile && allowedRoles.length > 0 && !allowedRoles.includes(authState.userProfile.role)) {
          isAuthorized = false;
          if (window.location.pathname.startsWith(path)) {
            navigate('/app', { replace: true }); // Or an "access-denied" page
          }
        } else {
          isAuthorized = true;
        }
      });
    </script>

    {#if isAuthorized}
      <Route {path}><slot /></Route>
    {/if}
    ```

11. **Placeholder Route Components:**
    Create the directory `/frontend/src/routes/`.

    *   **`/frontend/src/routes/Home.svelte`**:
        ```html
        <h1>Welcome to My SaaS App!</h1>
        <p>Public home page content.</p>
        ```

    *   **`/frontend/src/routes/SignIn.svelte`**:
        ```html
        <script lang="ts">
          import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
          import { auth, authStore } from '../lib/firebase';
          import { navigate } from 'svelte-routing';
          import { onMount } from 'svelte';

          let errorMsg = '';

          onMount(() => {
            const unsubscribe = authStore.subscribe(state => {
              if (!state.loading && state.firebaseUser) {
                navigate('/app', { replace: true });
              }
            });
            return unsubscribe;
          });

          const handleSignInWithGoogle = async () => {
            errorMsg = '';
            const provider = new GoogleAuthProvider();
            try {
              await signInWithPopup(auth, provider);
              // Navigation is handled by onMount subscription and onAuthStateChanged
            } catch (error: any) {
              console.error("Google Sign in error", error);
              errorMsg = error.message || "Failed to sign in with Google.";
            }
          };
        </script>

        <h1>Sign In</h1>
        <button on:click={handleSignInWithGoogle}>Sign In with Google</button>
        {#if errorMsg}<p style="color: red;">{errorMsg}</p>{/if}
        ```

    *   **`/frontend/src/routes/AppView.svelte`**:
        ```html
        <script lang="ts">
          import { authStore, isPremium } from '../lib/firebase';
          // UserProfile type is automatically available via $authStore.userProfile

          const handleGoToBilling = async () => {
            if (!$authStore.firebaseUser) {
                alert("Not authenticated!");
                return;
            }
            const token = await $authStore.firebaseUser.getIdToken();
            try {
                const response = await fetch('/api/stripe/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });
                const data = await response.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert(data.error || 'Could not create Stripe session.');
                }
            } catch (error) {
                console.error('Error creating checkout session:', error);
                alert('Error creating checkout session.');
            }
          };
        </script>

        <h1>App Dashboard</h1>
        {#if $authStore.userProfile}
          <p>Welcome, {$authStore.userProfile.displayName || $authStore.userProfile.email}!</p>
          <p>Your role: {$authStore.userProfile.role}</p>
          <p>Subscription Status: {$authStore.userProfile.subscriptionStatus || 'N/A'}</p>

          {#if isPremium($authStore.userProfile)}
            <p>🎉 PREMIUM features unlocked! 🎉</p>
          {:else if $authStore.userProfile.role === 'free'}
            <p>This is a FREE feature. Upgrade for more!</p>
            <button on:click={handleGoToBilling}>Upgrade to Premium</button>
          {/if}
        {:else}
          <p>Loading user data...</p>
        {/if}
        ```

    *   **`/frontend/src/routes/AdminView.svelte`**:
        ```html
        <script lang="ts">
          import { onMount } from 'svelte';
          import { authStore } from '../lib/firebase';
          import type { UserProfile } from 'shared'; // Uses 'shared' package

          let users: UserProfile[] = [];
          let loading = true;
          let error: string | null = null;

          onMount(async () => {
            if (!$authStore.firebaseUser) {
              error = "Not authenticated.";
              loading = false;
              return;
            }
            const token = await $authStore.firebaseUser.getIdToken();
            try {
              const response = await fetch('/api/admin/users', {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              if (!response.ok) {
                const errData = await response.json().catch(() => ({error: `Server error: ${response.status}`}));
                throw new Error(errData.error || `Failed to fetch users`);
              }
              users = await response.json();
            } catch (err: any) {
              error = err.message;
            } finally {
              loading = false;
            }
          });
        </script>

        <h1>Admin Panel</h1>
        {#if loading}
          <p>Loading users...</p>
        {:else if error}
          <p style="color: red;">Error: {error}</p>
        {:else if users.length === 0}
          <p>No users found.</p>
        {:else}
          <h2>Users ({users.length}):</h2>
          <ul style="list-style-type: none; padding: 0;">
            {#each users as user (user.uid)}
              <li style="border: 1px solid #ccc; padding: 0.5em; margin-bottom: 0.5em;">
                <!-- Display user details -->
                <strong>Email:</strong> {user.email || 'N/A'}<br/>
                <strong>Role:</strong> {user.role}<br/>
                <strong>UID:</strong> {user.uid}
              </li>
            {/each}
          </ul>
        {/if}
        ```

---

## IV. Backend (`/backend`) Hono API

1.  **`backend/package.json`:**
    Update `/backend/package.json` (merge with defaults):
    ```json
    {
      "name": "backend",
      "version": "1.0.0",
      "private": true,
      "type": "module", // Important for ES module syntax
      "scripts": {
        "dev": "ts-node-dev --respawn --transpile-only --esm src/index.ts",
        "start": "node dist/index.js",
        "build": "tsc",
        "lint": "echo 'Backend lint placeholder'"
      },
      "dependencies": {
        "hono": "^3.12.0", // Use specific latest or ^
        "firebase-admin": "^12.0.0",
        "stripe": "^14.10.0",
        "dotenv": "^16.3.1",
        "shared": "*" // Uses npm workspace version
      },
      "devDependencies": {
        "@hono/node-server": "^1.4.1",
        "@types/node": "^20.10.6",
        "ts-node-dev": "^2.0.0",
        "typescript": "^5.3.3"
      }
    }
    ```

2.  **`backend/tsconfig.json`:**
    Create `/backend/tsconfig.json`:
    ```json
    {
      "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "moduleResolution": "node", // Or "bundler"
        "resolveJsonModule": true,
        "baseUrl": ".", // Important for path aliases
        "paths": {
          "shared": ["../shared/src"] // For editor intellisense to src
        }
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules", "dist"]
    }
    ```

3.  **`backend/.env`:**
    Create `/backend/.env` (same content as pnpm version, ensure paths are correct):
    ```env
    # Firebase Service Account
    GOOGLE_APPLICATION_CREDENTIALS=./path/to/your-service-account-key.json
    # OR individual components:
    # FIREBASE_PROJECT_ID=...
    # FIREBASE_CLIENT_EMAIL=...
    # FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY...\n-----END PRIVATE KEY-----\n"

    # Stripe
    STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
    STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET
    STRIPE_PREMIUM_PRICE_ID=price_YOUR_PREMIUM_PRICE_ID

    # App
    APP_URL=http://localhost:5173 # Frontend URL
    PORT=3000 # Backend port
    ```

4.  **`backend/src/firebaseAdmin.ts`:**
    Create `/backend/src/firebaseAdmin.ts`:
    ```typescript
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
    ```

5.  **`backend/src/middleware.ts`:**
    Create `/backend/src/middleware.ts`:
    ```typescript
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
    ```

6.  **`backend/src/stripe.ts`:**
    Create `/backend/src/stripe.ts`:
    ```typescript
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

    ```

7.  **`backend/src/index.ts` (Main Hono App):**
    Create `/backend/src/index.ts`:
    ```typescript
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
    ```
    *The `... (same as pnpm version) ...` comments mean you should copy the exact logic from the previous pnpm-based response for that function/block, ensuring type imports come from `shared` directly.*

---

## V. Running the App

1.  **Install all dependencies from the root:**
    ```bash
    npm install
    ```
    *(This will also link your workspaces: `frontend`, `backend`, `shared`)*

2.  **Build shared types (once, or run in watch mode):**
    In one terminal:
    ```bash
    npm run dev -w shared
    ```
    *(This runs `tsc -w` for the shared package)*

3.  **Run Backend:**
    In a second terminal:
    ```bash
    npm run dev -w backend
    ```
    *(This will typically run on `http://localhost:3000`)*

4.  **Run Frontend:**
    In a third terminal:
    ```bash
    npm run dev -w frontend
    ```
    *(This will typically run on `http://localhost:5173` and proxy API calls)*

    Access the app via the frontend URL (e.g., `http://localhost:5173`).

---

## VI. Building for Production

1.  **Build Shared Package:**
    ```bash
    npm run build -w shared
    ```

2.  **Build Frontend:**
    ```bash
    npm run build -w frontend
    ```
    *(Populates `/dist` at the monorepo root)*

3.  **Build Backend:**
    ```bash
    npm run build -w backend
    ```
    *(Creates `dist` inside `/backend`)*

4.  **Start Backend (serves API and built frontend):**
    From the monorepo root:
    ```bash
    npm run start -w backend
    ```
    *(App accessible via backend port, e.g., `http://localhost:3000`)*

---

## VII. Firebase Setup

(This section remains identical to the pnpm version. It involves Firebase console configurations.)

1.  **Firebase Console:** Project creation/selection.
2.  **Authentication:** Enable sign-in providers.
3.  **Firestore Database:** Create database, choose mode (test/production).
4.  **Firestore Security Rules:** Update `/firestore.rules` (example provided previously).
5.  **Web App Configuration (for Frontend):** Get `firebaseConfig` for `/frontend/.env`.
6.  **Service Account (for Backend):** Download JSON key for `/backend/.env` (`GOOGLE_APPLICATION_CREDENTIALS`).

---

## VIII. Stripe Setup

(This section remains identical to the pnpm version. It involves Stripe dashboard configurations.)

1.  **Stripe Account:** Sign up/log in.
2.  **API Keys:** Get Secret Key for `/backend/.env`.
3.  **Product and Price:** Create product and price, note Price ID for `/backend/.env`.
4.  **Webhook Endpoint:** Configure URL (use ngrok/Stripe CLI for local dev), select events, get Signing Secret for `/backend/.env`.

---

This Markdown provides a comprehensive guide using `npm`. Remember to fill in placeholders and ensure the copied logic blocks (marked `/* ... */`) are correctly transferred.