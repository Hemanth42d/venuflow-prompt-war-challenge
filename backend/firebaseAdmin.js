import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize with service account or application default credentials
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  } else {
    // Fallback for local dev — uses emulator or default
    admin.initializeApp({ projectId: projectId || 'venueflow-demo' });
  }
}

export const db = admin.firestore();
export default admin;
