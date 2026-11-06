import "server-only";

import { eq } from "drizzle-orm";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { SIGN_IN_PATH } from "@/lib/auth/callback-url";
import { getDb, users } from "@/server/db";
import { getAuthEnv } from "@/server/env";

import { signInSchema, verifyDemoCredentials } from "./credentials";

/** The credentials matched, but the seed has not been run, so there is no customer to show. */
export class DemoUserMissing extends CredentialsSignin {
  override code = "demo_user_missing";
}

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/**
 * Auth.js with a single credentials provider for the demo customer. Sessions are stateless JWTs in
 * an encrypted, HttpOnly cookie, so no session table is needed. The config is built lazily so
 * `next build` does not need AUTH_SECRET.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = getAuthEnv();
  return {
    secret: env.AUTH_SECRET,
    // Vercel and `next start` behind a proxy: trust the forwarded host header.
    trustHost: true,
    session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
    pages: { signIn: SIGN_IN_PATH, error: SIGN_IN_PATH },
    providers: [
      Credentials({
        credentials: { email: { type: "email" }, password: { type: "password" } },
        async authorize(raw) {
          const parsed = signInSchema.safeParse(raw);
          if (!parsed.success) return null;

          const demo = { email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD };
          if (!verifyDemoCredentials(parsed.data, demo)) return null;

          const [user] = await getDb()
            .select({ id: users.id, email: users.email, name: users.name })
            .from(users)
            .where(eq(users.email, env.DEMO_USER_EMAIL))
            .limit(1);
          if (!user) throw new DemoUserMissing();
          return user;
        },
      }),
    ],
    callbacks: {
      // Auth.js stores the user id as `sub`; expose it on the session.
      session({ session, token }) {
        if (token.sub) session.user.id = token.sub;
        return session;
      },
    },
  };
});

/** The signed-in user's id, or null. Server components, route handlers and actions only. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
