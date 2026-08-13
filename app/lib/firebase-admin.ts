import admin from "firebase-admin";
import * as dotenv from "dotenv";
import path from "path";
import { logger } from "@/app/lib/logger";
import { stripUndefined } from "./utils/stripUndefined";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")?.replace(
    /^"|"$/g,
    ""
  ),
};

let adminDb: admin.database.Database | undefined;
let adminMessaging: admin.messaging.Messaging | undefined;
let adminAuth: admin.auth.Auth | undefined;

if (!admin.apps.length) {
  try {
    if (
      firebaseAdminConfig.clientEmail &&
      firebaseAdminConfig.privateKey &&
      firebaseAdminConfig.privateKey.includes("BEGIN PRIVATE KEY")
    ) {
      admin.initializeApp({
        credential: admin.credential.cert(stripUndefined(firebaseAdminConfig)),
        ...(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
          ? { databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL }
          : {}),
      });
      adminDb = admin.database();
      adminMessaging = admin.messaging();
      adminAuth = admin.auth();
    } else {
      logger.warn(
        "⚠️ Firebase credentials missing or invalid in .env. Realtime features will be disabled."
      );
    }
  } catch (error) {
    logger.error("❌ Firebase admin initialization error:", error);
  }
} else {
  adminDb = admin.database();
  adminMessaging = admin.messaging();
  adminAuth = admin.auth();
}

export { adminDb, adminMessaging, adminAuth };
