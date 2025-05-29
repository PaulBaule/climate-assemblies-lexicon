// src/firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKHsR6QdxvCAvuoXbADSfQnrj5jNOTxpk",
  authDomain: "climate-assemblies-lexicon.firebaseapp.com",
  projectId: "climate-assemblies-lexicon",
  storageBucket: "climate-assemblies-lexicon.firebasestorage.app",
  messagingSenderId: "837638376481",
  appId: "1:837638376481:web:1395e2dcf1e596f4e1e760"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth, app }; 