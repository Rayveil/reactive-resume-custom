import type { User } from "better-auth";

import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { Locale } from "@/utils/locale";

import { env } from "@/utils/env";

import { auth } from "../auth/config";
import { db } from "../drizzle/client";
import { user } from "../drizzle/schema";

interface ORPCContext {
  locale: Locale;
  reqHeaders?: Headers;
}

async function getUserFromHeaders(headers: Headers): Promise<User | null> {
  try {
    const result = await auth.api.getSession({ headers });
    if (!result || !result.user) return null;

    return result.user;
  } catch {
    return null;
  }
}

async function getUserFromApiKey(apiKey: string): Promise<User | null> {
  try {
    const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
    if (!result.key || !result.valid) return null;

    const [userResult] = await db.select().from(user).where(eq(user.id, result.key.referenceId)).limit(1);
    if (!userResult) return null;

    return userResult;
  } catch {
    return null;
  }
}

// In-memory fallback dev user for when database is unavailable
let cachedDevUser: User | null = null;

async function getOrCreateDevelopmentGuestUser(): Promise<User | null> {
  if (process.env.NODE_ENV !== "development") return null;

  const devGuest = {
    name: "Development Guest",
    email: "dev-guest@reactive-resume.local",
    username: "devguest",
    displayUsername: "devguest",
  };

  try {
    const [existingUser] = await db.select().from(user).where(eq(user.email, devGuest.email)).limit(1);
    if (existingUser) {
      cachedDevUser = existingUser;
      return existingUser;
    }

    const [createdUser] = await db.insert(user).values(devGuest).returning();
    if (createdUser) {
      cachedDevUser = createdUser;
      return createdUser;
    }
    return null;
  } catch {
    // If database is unavailable, use in-memory cached dev user
    if (cachedDevUser) return cachedDevUser;

    // Create a minimal virtual user for development without database
    cachedDevUser = {
      id: "dev-guest-virtual-" + Date.now(),
      image: null,
      name: devGuest.name,
      email: devGuest.email,
      emailVerified: false,
      username: devGuest.username,
      displayUsername: devGuest.displayUsername,
      twoFactorEnabled: false,
      lastActiveAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    return cachedDevUser;
  }
}

const base = os.$context<ORPCContext>();

export const publicProcedure = base.use(async ({ context, next }) => {
  const headers = context.reqHeaders ?? new Headers();
  const apiKey = headers.get("x-api-key");

  const authenticatedUser = apiKey ? await getUserFromApiKey(apiKey) : await getUserFromHeaders(headers);
  const currentUser = authenticatedUser ?? (await getOrCreateDevelopmentGuestUser());

  return next({
    context: {
      ...context,
      user: currentUser ?? null,
    },
  });
});

export const protectedProcedure = publicProcedure.use(async ({ context, next }) => {
  if (!context.user) throw new ORPCError("UNAUTHORIZED");

  return next({
    context: {
      ...context,
      user: context.user,
    },
  });
});

/**
 * Protected in production, relaxed in development to support local guest flows.
 */
export const protectedProcedureInProduction = publicProcedure.use(async ({ context, next }) => {
  if (!context.user && process.env.NODE_ENV !== "development") {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      ...context,
      user: context.user,
    },
  });
});

/**
 * Server-only procedure that can only be called from server-side code (e.g., loaders).
 * Rejects requests from the browser with a 401 UNAUTHORIZED error.
 */
export const serverOnlyProcedure = publicProcedure.use(async ({ context, next }) => {
  const headers = context.reqHeaders ?? new Headers();
  const isDebugBypassEnabled = env.FLAG_DEBUG_PRINTER && process.env.NODE_ENV === "development";

  // Check for the custom header that indicates this is a server-side call
  // Server-side calls using createRouterClient have this header set
  const isServerSideCall = isDebugBypassEnabled || headers.get("x-server-side-call") === "true";

  // If the header is not present, this is a client-side HTTP request - reject it
  if (!isServerSideCall) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "This endpoint can only be called from server-side code",
    });
  }

  return next({ context });
});
