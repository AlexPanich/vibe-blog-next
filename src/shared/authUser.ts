import type { Role } from "@/database/schema";
import type { User } from "@/database/types";

export type AuthUser = Pick<User, 'id' | 'name' | 'email' | 'avatarKey'> & { roles: Role[] }
