import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";

dotenv.config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

const firebaseAdmin = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});

export default firebaseAdmin;
