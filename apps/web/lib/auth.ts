import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

async function syncUserToApi(params: {
  githubId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}): Promise<{ id: string }> {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  const secret = process.env.INTERNAL_API_SECRET;

  if (!apiUrl) {
    throw new Error(
      "API_URL (or NEXT_PUBLIC_API_URL) is required for auth sync",
    );
  }
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is required for auth sync");
  }

  const response = await fetch(`${apiUrl}/internal/auth/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": secret,
    },
    body: JSON.stringify({
      github_id: params.githubId,
      email: params.email,
      name: params.name,
      avatar_url: params.avatarUrl,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to sync user (status ${response.status})`);
  }

  const data = (await response.json()) as {
    success: boolean;
    data?: { user?: { id: string } };
  };

  const id = data.data?.user?.id;
  if (!id) {
    throw new Error("Failed to sync user (missing id)");
  }

  return { id };
}

const config: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user?.email) {
        token.email = user.email;
      }

      // On first sign-in, sync the user to the API (D1) and store the D1 user id in the JWT.
      if (!token.scraperUserId && account?.provider === "github" && profile) {
        const rawProfileId = (profile as { id?: unknown }).id;
        const githubId =
          typeof rawProfileId === "string"
            ? rawProfileId
            : typeof rawProfileId === "number"
              ? String(rawProfileId)
              : null;

        if (githubId && user?.email) {
          const synced = await syncUserToApi({
            githubId,
            email: user.email,
            name: user.name ?? null,
            avatarUrl: user.image ?? null,
          });
          token.scraperUserId = synced.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.scraperUserId as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/playground") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/api-keys");

      if (isOnDashboard) {
        return isLoggedIn;
      }

      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
