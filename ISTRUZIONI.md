# 🏡 App Famiglia — Guida installazione

Segui questi passi nell'ordine. Ci vogliono circa 30 minuti.

---

## PARTE 1 — Firebase (database gratuito)

### 1.1 Crea il progetto Firebase
1. Vai su https://firebase.google.com
2. Clicca **"Get started"** → accedi con Gmail
3. Clicca **"Create a project"**
4. Nome: `famiglia-mattia-silvia` → Continua
5. Disabilita Google Analytics → **Create project**
6. Aspetta che crei il progetto (10-15 secondi)

### 1.2 Attiva il database
1. Nel menu a sinistra clicca **"Realtime Database"**
2. Clicca **"Create Database"**
3. Scegli la posizione più vicina (es. `europe-west1`) → **Next**
4. Seleziona **"Start in test mode"** → **Enable**

### 1.3 Modifica le regole di sicurezza
1. Clicca sulla scheda **"Rules"**
2. Sostituisci tutto il testo con questo:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```
3. Clicca **"Publish"**

### 1.4 Crea gli account di Mattia e Silvia
1. Nel menu a sinistra clicca **"Authentication"**
2. Clicca **"Get started"**
3. Clicca su **"Email/Password"** → attivalo → **Save**
4. Clicca sulla scheda **"Users"** → **"Add user"**
5. Aggiungi Mattia: email e password a scelta → **Add user**
6. Ripeti per Silvia: email e password a scelta → **Add user**
   ⚠️ Segna queste credenziali, serviranno per entrare nell'app

### 1.5 Ottieni le chiavi di configurazione
1. Clicca sulla ⚙️ in alto a sinistra → **"Project settings"**
2. Scorri in basso fino a **"Your apps"**
3. Clicca sull'icona **`</>`** (Web)
4. App nickname: `famiglia` → **Register app**
5. Vedrai un blocco di codice con `firebaseConfig` — **lascia aperta questa pagina**

---

## PARTE 2 — Prepara il codice

### 2.1 Installa Node.js
1. Vai su https://nodejs.org
2. Scarica la versione **LTS** e installala

### 2.2 Modifica il file Firebase
1. Apri la cartella `famiglia-app`
2. Apri il file `src/firebase.js` con un editor di testo (anche Blocco Note)
3. Sostituisci ogni `"INSERISCI_QUI"` con i valori dalla pagina Firebase aperta prima
4. Salva il file

Esempio di come deve sembrare:
```js
const firebaseConfig = {
  apiKey: "AIzaSyAbc123...",
  authDomain: "famiglia-mattia-silvia.firebaseapp.com",
  databaseURL: "https://famiglia-mattia-silvia-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "famiglia-mattia-silvia",
  storageBucket: "famiglia-mattia-silvia.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## PARTE 3 — Pubblica su Vercel

### 3.1 Crea account GitHub
1. Vai su https://github.com
2. Clicca **"Sign up"** → crea un account gratuito

### 3.2 Carica il codice su GitHub
1. Una volta dentro GitHub, clicca **"+"** in alto a destra → **"New repository"**
2. Nome: `famiglia-app` → **Create repository**
3. Clicca **"uploading an existing file"**
4. Trascina TUTTI i file della cartella `famiglia-app` nella pagina
   ⚠️ Carica anche la cartella `src` con i file dentro
5. Clicca **"Commit changes"**

### 3.3 Pubblica con Vercel
1. Vai su https://vercel.com
2. Clicca **"Sign Up"** → scegli **"Continue with GitHub"**
3. Clicca **"Add New Project"**
4. Seleziona il repository `famiglia-app`
5. Lascia tutte le impostazioni di default → **Deploy**
6. Aspetta 1-2 minuti → Vercel ti dà un link tipo `famiglia-app.vercel.app`

---

## PARTE 4 — Usare l'app

1. Apri il link su qualsiasi telefono o PC
2. Entra con email e password create nel passo 1.4
3. Manda il link a Mattia — lui entra con le sue credenziali
4. Tutti i dati sono condivisi in tempo reale 🎉

---

## Problemi comuni

**"Firebase config not found"** → Controlla di aver salvato correttamente `src/firebase.js`

**"Permission denied"** → Controlla le regole del database (Parte 1.3)

**Non riesci ad entrare** → Verifica email e password create in Authentication

---

## Aggiungere l'app alla home del telefono

**iPhone/iPad:** Apri il link in Safari → tocca il tasto Condividi → "Aggiungi a schermata Home"

**Android:** Apri il link in Chrome → menu (3 puntini) → "Aggiungi a schermata Home"
