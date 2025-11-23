// Augment better-auth/react AuthClient to include device method
import "better-auth/react";

declare module "better-auth/react" {
    interface AuthClient {
        /** Device Authorization flow – query the server for a user code */
        device: (options: { query: { user_code: string } }) => Promise<any>;
    }
}
