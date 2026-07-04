import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// ⚠️ SOSTITUISCI questi valori con quelli del tuo progetto Firebase
// Li trovi su: Firebase Console → Il tuo progetto → Impostazioni → App web
const firebaseConfig = {
  apiKey: "AIzaSyCg1MrfTs_drOkKEKmhASKtHXm7BEmI46I",
  authDomain: "casa-mia-cbc1d.firebaseapp.com",
  databaseURL: "https://casa-mia-cbc1d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "casa-mia-cbc1d",
  storageBucket: "casa-mia-cbc1d.firebasestorage.app",
  messagingSenderId: "1081443886177",
  appId: "1:1081443886177:web:6131e3f9f7d5a37e5a7620"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
