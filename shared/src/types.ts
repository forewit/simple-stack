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