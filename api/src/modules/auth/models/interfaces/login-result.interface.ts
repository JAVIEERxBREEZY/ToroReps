import type { UserSummary } from "../../../users/models/types/user.types.js";

export interface LoginResult {
  user: UserSummary;
  sessionToken: string;
}