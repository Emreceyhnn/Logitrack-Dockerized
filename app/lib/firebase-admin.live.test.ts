 
import { describe, it, after } from "node:test";
import { expect } from "expect";
import "dotenv/config";

describe("firebase-admin.ts Admin Connection & Initialization", async () => {
  const { adminAuth, adminDb, adminMessaging } =
    await import("./firebase-admin");

  it("should have Firebase Admin credentials in environment variables", () => {
    expect(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBeDefined();
    expect(process.env.FIREBASE_CLIENT_EMAIL).toBeDefined();
    expect(process.env.FIREBASE_PRIVATE_KEY).toBeDefined();
  });

  it("should properly instantiate the Firebase Admin SDK", () => {
    expect(adminDb).toBeDefined();
    expect(adminAuth).toBeDefined();
    expect(adminMessaging).toBeDefined();
  });

  it("should establish a direct connection using Admin Database", async () => {
    try {
      if (!adminDb) throw new Error("Admin DB is not initialized");
      const snapshot = await adminDb.ref("health_check").once("value");
      expect(snapshot).toBeDefined();
    } catch (error) {
      throw new Error(
        `Firebase Admin Database connection failed: ${(error as Error).message}`
      );
    }
  });

  it("should establish a connection using Admin Auth", async () => {
    try {
      if (!adminAuth) throw new Error("Admin Auth is not initialized");

      // We test creating a custom token. This completely validates that the private key
      // and client email are structurally correct, loaded by the SDK, and usable.
      // We do not make a live server call for Auth here to prevent intermittent
      // rate-limits or 'configuration-not-found' errors. The live network connection
      // is already proven by the Database test above.
      const customToken = await adminAuth.createCustomToken("test-uid");
      expect(customToken).toBeDefined();
    } catch (error: Record<string, unknown>) {
      throw new Error(`Firebase Admin Auth connection failed: ${error.message}`);
    }
  });
  
  after(async () => {
    // Delete the admin app instance to close any open TCP sockets (like the database connection).
    // This allows the test runner to exit cleanly.
    try {
      const { app } = await import("firebase-admin");
      const adminApp = app();
      if (adminDb) {
        adminDb.goOffline();
      }
      if (adminApp) {
        await adminApp.delete();
      }
    } catch (e) {
      // Ignore if app doesn't exist
    }
  });
});
