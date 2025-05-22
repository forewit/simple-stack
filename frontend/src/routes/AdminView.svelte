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