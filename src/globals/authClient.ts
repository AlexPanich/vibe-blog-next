import 'client-only';
import { createAuthClient } from "better-auth/react"

export const { signIn, signOut, getSession } = createAuthClient();
