import admin from "firebase-admin";

function getEnv(name) {
  const v = process.env[name];
  return typeof v === "string" ? v : "";
}

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const projectId = getEnv("FIREBASE_PROJECT_ID");
    const clientEmail = getEnv("FIREBASE_CLIENT_EMAIL");
    const privateKey = getEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
    const storageBucket = getEnv("FIREBASE_STORAGE_BUCKET");

    if (!projectId || !clientEmail || !privateKey || !storageBucket) {
      throw new Error(
        "Missing Firebase env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET."
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
  }

  return admin;
}

