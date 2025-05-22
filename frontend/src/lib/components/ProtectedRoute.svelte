<script lang="ts">
  import { Route, navigate } from 'svelte-routing';
  import { authStore } from '../firebase';
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