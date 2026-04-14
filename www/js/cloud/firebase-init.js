// =====================================
// Neyra Firebase Init
// =====================================
// Configured from google-services.json

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXpctts26Im3-K2chYwWMumryfeZ_ux88",
  authDomain: "neyra-app.firebaseapp.com",
  projectId: "neyra-app",
  storageBucket: "neyra-app.firebasestorage.app",
  messagingSenderId: "532963333795",
  appId: "1:532963333795:web:placeholder_web_id"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY";
}
