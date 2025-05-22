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