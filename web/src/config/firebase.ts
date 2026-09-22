import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBtqnhkIqRSdZ_pLA7sdWB9bKy5WQBVvGg",
  authDomain: "crmcalling-60005.firebaseapp.com",
  projectId: "crmcalling-60005",
  storageBucket: "crmcalling-60005.firebasestorage.app",
  messagingSenderId: "842884624865",
  appId: "1:842884624865:web:a73e321a2bbd98a4ade2a0",
  measurementId: "G-WQLYENBR23",
};

// Initialize Firebase once
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
