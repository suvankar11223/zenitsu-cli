// Type augmentation for better-auth to include a custom `device` field
import "better-auth";

declare module "better-auth" {
    interface User {
        /** Optional device identifier (e.g., "cli", "web") */
        device?: string;
    }

    interface Session {
        /** Mirrors the user's device field */
        device?: string;
    }

    /** Extend sign‑in options to allow passing extra data */
    interface SignInOptions {
        additionalData?: {
            device?: string;
        };
    }
}
