import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db.js";
import { deviceAuthorization } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: "http://localhost:3005",
  basePath: "/api/auth",
  trustedOrigins: ["http://localhost:3000"],

  advanced: {
    // -----------------------------------------------------------------
    // Add a custom `device` field to the user/session records
    // -----------------------------------------------------------------
    // This will allow us to store a device identifier (e.g., "cli", "web")
    // during sign‑in.
    // -----------------------------------------------------------------
    // Note: the `additionalFields` block is added just after `advanced`
    // -----------------------------------------------------------------
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
  // -----------------------------------------------------------------
  // Register the custom `device` field so it is persisted in the DB.
  // -----------------------------------------------------------------
  additionalFields: {
    device: { type: "string", optional: true },
  },

  plugins: [
    deviceAuthorization({
      // Optional configuration
      expiresIn: "30m", // Device code expiration time
      interval: "5s", // Minimum polling interval

    }),
  ],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },

  },

  logger: {
    level: "debug"
  }
});
