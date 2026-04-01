import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Credenciales de tu Panel SaaS (Centrol-Soft / Panel-Soft)
const licenseConfig = {
  apiKey: import.meta.env.VITE_LICENSE_API_KEY,
  authDomain: import.meta.env.VITE_LICENSE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_LICENSE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_LICENSE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_LICENSE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_LICENSE_APP_ID
};

const appName = "LicenseCheckApp";
let licenseApp;

if (!getApps().some(app => app.name === appName)) {
  licenseApp = initializeApp(licenseConfig, appName);
} else {
  licenseApp = getApp(appName);
}

export const licenseDb = getFirestore(licenseApp);
