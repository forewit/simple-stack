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