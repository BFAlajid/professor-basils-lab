export interface SafeUser {
  id: string;
  email: string;
  displayName: string | null;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
