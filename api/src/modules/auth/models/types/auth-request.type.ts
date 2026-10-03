import type { IncomingHttpHeaders } from 'node:http';
import type { UserSummary } from '../../../users/models/types/user.types.js';

export interface AuthRequest {
  headers: IncomingHttpHeaders;
  user?: UserSummary;
}