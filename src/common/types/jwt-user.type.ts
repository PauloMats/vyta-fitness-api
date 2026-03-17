import type { UserRole, UserStatus } from '@prisma/client';

export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}
