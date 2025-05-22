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