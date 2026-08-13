 
import { describe, it, after } from "node:test";
import { expect } from "expect";
import "dotenv/config";
import { get } from "firebase/database";

describe("firebase.ts Client Connection & Initialization", async () => {
  const { db, ref, app } = await import("./firebase");

  it("should have Firebase configuration in environment variables", () => {
    expect(process.env.NEXT_PUBLIC_FIREBASE_API_KEY).toBeDefined();
    expect(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBeDefined();
    expect(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL).toBeDefined();
  });

  it("should properly instantiate the Firebase Realtime Database client", () => {
    expect(db).toBeDefined();
  });

  it("should establish a direct connection to the Firebase Database", async () => {
    try {
      const testRef = ref(db, "health_check");
      const snapshot = await get(testRef);
      expect(snapshot).toBeDefined();
    } catch (error) {
      if ((error as unknown).message?.includes("Permission denied")) {
        // Permission denied = reached Firebase, rules evaluated = connection OK
        expect(true).toBe(true);
      } else {
        throw new Error(`Firebase connection failed: ${(error as Error).message}`);
      }
    }
  });

  after(async () => {
    const { goOffline } = await import("firebase/database");
    const { deleteApp } = await import("firebase/app");
    if (db) goOffline(db);
    if (app) await deleteApp(app);
  });
});
