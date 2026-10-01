export interface CreateUserInput {
  emailEncrypted: string;
  emailLookupHash: string;
  passwordHash: string;
  displayName: string;
}
