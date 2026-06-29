import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import fs from "fs";

// Safe initialization of Firebase Admin to avoid crashes in Local DB mode
let isFirebaseInitialized = false;
let isFirestoreEnabled = false; // Start as false to avoid transient startup errors before API confirm
let isFirebaseAuthEnabled = false; // Start as false to avoid transient auth/signBlob errors

function canUseFirestore(): boolean {
  return isFirebaseInitialized && isFirestoreEnabled;
}

function canUseFirebaseAuth(): boolean {
  return isFirebaseInitialized && isFirebaseAuthEnabled;
}

try {
  // If we are explicitly in Local DB mode, we don't need Firebase admin
  if (process.env.VITE_LOCAL_DB !== 'true') {
    admin.initializeApp();
    isFirebaseInitialized = true;
    console.log("Firebase Admin successfully initialized.");

    // Perform an asynchronous connectivity test to confirm Cloud Firestore API is active and functional
    console.log("[Firestore Access Test] Testing credentials and API enablement for Cloud Firestore...");
    admin.firestore().collection("_connection_test").limit(1).get()
      .then(() => {
        console.log("[Firestore Access Test] Cloud Firestore is ACTIVE and accessible.");
        isFirestoreEnabled = true;
      })
      .catch((err: any) => {
        console.warn("[Firestore Access Test] Cloud Firestore is disabled, unprovisioned, or restricted in this GCP project:", err?.message || err);
        console.warn("[Firestore Access Test] Automatically disabling Firestore proxy features and falling back to Flat File local storage.");
        isFirestoreEnabled = false;
      });

    // Perform an asynchronous connectivity test for Firebase Auth to confirm Identity Toolkit API is active
    console.log("[Firebase Auth Access Test] Testing credentials and API enablement for Identity Toolkit (Auth)...");
    admin.auth().listUsers(1)
      .then(() => {
        console.log("[Firebase Auth Access Test] Firebase Authentication API is ACTIVE and accessible.");
        isFirebaseAuthEnabled = true;
      })
      .catch((err: any) => {
        const errMsg = String(err?.message || err);
        if (errMsg.includes("Identity Toolkit API") || errMsg.includes("disabled") || errMsg.includes("PERMISSION_DENIED")) {
          console.warn("[Firebase Auth Access Test] Firebase Authentication API or service is disabled or restricted in this project.");
          isFirebaseAuthEnabled = false;
        } else {
          // If the error is simply about permissions to list users, the API itself is enabled!
          console.log("[Firebase Auth Access Test] Firebase Authentication API is active (permissions may be restricted, enabling with login-only fallback).");
          isFirebaseAuthEnabled = true;
        }
      });
  } else {
    console.log("Firebase Admin bypassed - Running in Local DB mode.");
    isFirestoreEnabled = false;
    isFirebaseAuthEnabled = false;
  }
} catch (err) {
  console.log("Firebase Admin could not be auto-initialized, falling back to local database operations.", err);
  isFirestoreEnabled = false;
  isFirebaseAuthEnabled = false;
}

// Local Database disk management
const DATA_DIR = path.join(process.cwd(), "local_data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getSafeFileName(collectionName: string): string {
  // Translate nested collection names cleanly into a safe flat-file database format
  const name = collectionName.replace(/\//g, "_").replace(/[^a-zA-Z0-9_\-]/g, "_");
  return path.join(DATA_DIR, `${name}.json`);
}

function readJSONFile(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) || [];
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

function writeJSONFile(filePath: string, data: any[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

function getFirestorePath(flatName: string): string {
  if (flatName && flatName.startsWith("companies_")) {
    const parts = flatName.split("_");
    if (parts.length >= 3) {
      const sub = parts[parts.length - 1];
      const companyId = parts.slice(1, parts.length - 1).join("_");
      return `companies/${companyId}/${sub}`;
    }
  }
  return flatName;
}

function formatFirestoreDoc(val: any): any {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) {
    return {
      __type: "Timestamp",
      seconds: Math.floor(val.getTime() / 1000),
      nanoseconds: (val.getTime() % 1000) * 1000000
    };
  }
  if (typeof val === "object") {
    if (
      typeof val.toDate === "function" || 
      (val.constructor && val.constructor.name === "Timestamp") || 
      (typeof val._seconds === "number" && typeof val._nanoseconds === "number") ||
      (typeof val.seconds === "number" && typeof val.nanoseconds === "number")
    ) {
      const seconds = typeof val.seconds === "number" ? val.seconds : (typeof val._seconds === "number" ? val._seconds : 0);
      const nanoseconds = typeof val.nanoseconds === "number" ? val.nanoseconds : (typeof val._nanoseconds === "number" ? val._nanoseconds : 0);
      return {
        __type: "Timestamp",
        seconds,
        nanoseconds
      };
    }
    if (Array.isArray(val)) {
      return val.map(formatFirestoreDoc);
    }
    const result: any = {};
    for (const key of Object.keys(val)) {
      result[key] = formatFirestoreDoc(val[key]);
    }
    return result;
  }
  return val;
}

function parseFirestoreDoc(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === "object") {
    if (val.__type === "Timestamp" && typeof val.seconds === "number") {
      return admin.firestore.Timestamp.fromMillis(val.seconds * 1000);
    }
    if (typeof val.seconds === "number" && typeof val.nanoseconds === "number" && Object.keys(val).length === 2) {
      return admin.firestore.Timestamp.fromMillis(val.seconds * 1000);
    }
    if (Array.isArray(val)) {
      return val.map(parseFirestoreDoc);
    }
    const result: any = {};
    for (const key of Object.keys(val)) {
      result[key] = parseFirestoreDoc(val[key]);
    }
    return result;
  }
  return val;
}

function ensureLocalDataSeeded() {
  const authUsersPath = getSafeFileName("auth_users");
  const authUsers = readJSONFile(authUsersPath);

  const hasMaster = authUsers.some(u => u.email.toLowerCase() === "emailparasiteslixo@gmail.com");
  
  if (authUsers.length === 0 || !hasMaster) {
    console.log("[Local Seeding] Seeding Master SaaS accounts and demo company...");
    
    // 1. Seed Auth Users
    const usersToSeed = [
      {
        uid: "diretor-local-id",
        email: "diretor@exemplo.com",
        password: "123456",
        displayName: "Diretor Geral (Local)"
      },
      {
        uid: "emailparasiteslixo-id",
        email: "emailparasiteslixo@gmail.com",
        password: "123456",
        displayName: "Andre Fonseca"
      },
      {
        uid: "alffonseca42-id",
        email: "alffonseca42@gmail.com",
        password: "123456",
        displayName: "Alff Fonseca"
      }
    ];

    for (const u of usersToSeed) {
      if (!authUsers.some(existing => existing.email.toLowerCase() === u.email.toLowerCase())) {
        authUsers.push(u);
      }
    }
    writeJSONFile(authUsersPath, authUsers);

    // 2. Seed Users metadata
    const usersPath = getSafeFileName("users");
    const users = readJSONFile(usersPath);
    const metadataToSeed = [
      {
        id: "diretor-local-id",
        displayName: "Diretor Geral (Local)",
        email: "diretor@exemplo.com",
        role: "diretor",
        companyId: "default-company-id",
        createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
      },
      {
        id: "emailparasiteslixo-id",
        displayName: "Andre Fonseca",
        email: "emailparasiteslixo@gmail.com",
        role: "super_admin",
        companyId: "default-company-id",
        createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
      },
      {
        id: "alffonseca42-id",
        displayName: "Alff Fonseca",
        email: "alffonseca42@gmail.com",
        role: "super_admin",
        companyId: "default-company-id",
        createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
      }
    ];

    for (const m of metadataToSeed) {
      if (!users.some(existing => existing.email.toLowerCase() === m.email.toLowerCase())) {
        users.push(m);
      }
    }
    writeJSONFile(usersPath, users);

    // 3. Seed Company Settings inside nested collection companies/default-company-id/settings
    const compSettingsPath = getSafeFileName("companies_default-company-id_settings");
    const compSettings = readJSONFile(compSettingsPath);
    if (!compSettings.some(s => s.id === "general")) {
      compSettings.push({
        id: "general",
        companyName: "SegurTec-Pro Gestão",
        createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
      });
      writeJSONFile(compSettingsPath, compSettings);
    }

    const generalSettings = compSettings.find(s => s.id === "general");
    const seededCompanyName = (generalSettings && generalSettings.companyName) || "SegurTec-Pro Gestão";

    // 4. Seed Companies
    const companiesPath = getSafeFileName("companies");
    const companies = readJSONFile(companiesPath);
    if (!companies.some(c => c.id === "default-company-id")) {
      companies.push({
        id: "default-company-id",
        name: seededCompanyName,
        ownerId: "emailparasiteslixo-id",
        status: "active",
        inviteCode: "MASTER",
        createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
      });
      writeJSONFile(companiesPath, companies);
    }

    // 5. Seed Registration Codes
    const regCodesPath = getSafeFileName("registration_codes");
    const regCodes = readJSONFile(regCodesPath);
    if (!regCodes.some(c => c.code === "MASTER123")) {
      regCodes.push({
        id: "code-master-123",
        code: "MASTER123",
        status: "active",
        createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
      });
      writeJSONFile(regCodesPath, regCodes);
    }

    // 6. Seed SaaS Settings global
    const saasPath = getSafeFileName("saas_settings");
    const saasSettingsList = readJSONFile(saasPath);
    if (!saasSettingsList.some(s => s.id === "global")) {
      saasSettingsList.push({
        id: "global",
        price: 99.90,
        billingCycle: "mensal",
        latestVersion: "1.2.0",
        latestNotes: "Melhorias de desempenho e correções visuais.",
        latestFileUrl: "",
        supportPhone: "(83) 98132-7204",
        supportWhatsapp: "+55 (83) 98132-7204",
        supportEmail: "suporte@segurtecpro.com.br",
        splashDuration: 2.5
      });
      writeJSONFile(saasPath, saasSettingsList);
    }
    
    console.log("[Local Seeding] Seeding completed successfully!");
  }

  // Always check and repair core Admin/Director metadata in the local database to bypass wizard
  const usersPath = getSafeFileName("users");
  const users = readJSONFile(usersPath);
  let usersChanged = false;
  
  const repairs = [
    { email: "emailparasiteslixo@gmail.com", id: "emailparasiteslixo-id", role: "super_admin" },
    { email: "alffonseca42@gmail.com", id: "alffonseca42-id", role: "super_admin" }
  ];

  for (const rep of repairs) {
    const foundIdx = users.findIndex((u: any) => u.email && u.email.toLowerCase() === rep.email.toLowerCase());
    if (foundIdx >= 0) {
      if (users[foundIdx].role !== rep.role) {
        users[foundIdx].role = rep.role;
        usersChanged = true;
      }
      if (!users[foundIdx].companyId) {
        users[foundIdx].companyId = "default-company-id";
        usersChanged = true;
      }
    } else {
      users.push({
        id: rep.id,
        displayName: rep.email === "emailparasiteslixo@gmail.com" ? "Andre Fonseca" : (rep.email === "alffonseca42@gmail.com" ? "Alff Fonseca" : "Diretor Geral (Local)"),
        email: rep.email,
        role: rep.role,
        companyId: "default-company-id",
        createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
      });
      usersChanged = true;
    }
  }

  const companiesPath = getSafeFileName("companies");
  const companies = readJSONFile(companiesPath);
  if (!companies.some((c: any) => c.id === "default-company-id")) {
    const compSettingsPath = getSafeFileName("companies_default-company-id_settings");
    const compSettings = readJSONFile(compSettingsPath);
    const generalSettings = compSettings.find(s => s.id === "general");
    const repairCompanyName = (generalSettings && generalSettings.companyName) || "SegurTec-Pro Gestão";

    companies.push({
      id: "default-company-id",
      name: repairCompanyName,
      ownerId: "emailparasiteslixo-id",
      status: "active",
      inviteCode: "MASTER",
      createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
    });
    writeJSONFile(companiesPath, companies);
  }

  // ONLY auto-heal companyId for master admin accounts if missing
  const masterEmails = ["emailparasiteslixo@gmail.com", "alffonseca42@gmail.com"];
  for (let i = 0; i < users.length; i++) {
    const userEmail = (users[i].email || "").toLowerCase().trim();
    if (masterEmails.includes(userEmail) && (!users[i].companyId || users[i].companyId === "")) {
      users[i].companyId = "default-company-id";
      usersChanged = true;
    }
  }

  if (usersChanged) {
    writeJSONFile(usersPath, users);
    console.log("[Local Seeding] Core metadata profiles repaired successfully!");
  }
}

async function startServer() {
  ensureLocalDataSeeded();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", localdb: true });
  });

  app.get("/api/db-status", (req, res) => {
    res.json({
      isFirestoreEnabled,
      isFirebaseInitialized
    });
  });

  app.get("/api/admin/debug-firestore", async (req, res) => {
    try {
      if (!isFirebaseInitialized) {
        return res.json({ error: "Firebase is not initialized." });
      }
      const dbObj = admin.firestore();
      
      const usersSnap = await dbObj.collection("users").get();
      const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const companiesSnap = await dbObj.collection("companies").get();
      const companiesList = companiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return res.json({
        usersCount: usersList.length,
        companiesCount: companiesList.length,
        users: usersList,
        companies: companiesList
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  // API Shutdown Endpoint
  app.post("/api/system/shutdown", (req, res) => {
    res.json({ success: true, message: "Encerrando servidor local..." });
    console.log("Comando de encerramento recebido do cliente do sistema. Finalizando processo em 1 segundo...");
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

  // --- Auth Sign-In / Sign-Up Local Database Endpoints ---

  app.post("/api/localdb/auth/signin", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Nome de usuário e senha são obrigatórios." });
    }

    // Ensure database is seeded
    ensureLocalDataSeeded();

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // 1. Compile all potential local database keys/users
    const mergedUsersMap = new Map<string, any>();

    // A. Read local auth_users.json
    try {
      const authUsersPath = getSafeFileName("auth_users");
      const authUsers = readJSONFile(authUsersPath);
      authUsers.forEach((u: any) => {
        const emailKey = String(u.email || "").trim().toLowerCase();
        const key = emailKey || String(u.displayName || "").trim().toLowerCase() || u.uid;
        if (key) {
          mergedUsersMap.set(key, {
            uid: u.uid || u.id,
            email: u.email || "",
            displayName: u.displayName || "",
            password: String(u.password || "").trim(),
            altDisplayNames: u.displayName ? [u.displayName] : []
          });
        }
      });
    } catch (e) {
      console.warn("Error reading local auth_users:", e);
    }

    // B. Read local users.json
    try {
      const usersPath = getSafeFileName("users");
      const users = readJSONFile(usersPath);
      users.forEach((u: any) => {
        const emailKey = String(u.email || "").trim().toLowerCase();
        const key = emailKey || String(u.displayName || "").trim().toLowerCase() || u.id;
        if (key) {
          if (mergedUsersMap.has(key)) {
            const existing = mergedUsersMap.get(key);
            if (u.password && String(u.password).trim()) {
              existing.password = String(u.password).trim();
            }
            if (u.displayName) {
              existing.altDisplayNames = existing.altDisplayNames || [];
              if (!existing.altDisplayNames.some((d: string) => d.toLowerCase() === u.displayName.toLowerCase())) {
                existing.altDisplayNames.push(u.displayName);
              }
            }
          } else {
            mergedUsersMap.set(key, {
              uid: u.id || u.uid,
              email: u.email || "",
              displayName: u.displayName || "",
              password: String(u.password || "").trim(),
              altDisplayNames: u.displayName ? [u.displayName] : []
            });
          }
        }
      });
    } catch (e) {
      console.warn("Error reading local users file:", e);
    }

    const allUnifiedUsers = Array.from(mergedUsersMap.values());

    // 2. Perform intelligent matching logic
    const typedRaw = String(email).trim();
    const typedLower = typedRaw.toLowerCase();
    const typedClean = typedLower.replace(/[^a-z0-9]/g, ""); // e.g. "andrefonseca"
    const typedUserPart = typedLower.includes("@") ? typedLower.split("@")[0] : typedLower;

    let matchedUser = null;

    for (const u of allUnifiedUsers) {
      const uEmail = String(u.email || "").trim().toLowerCase();
      const uEmailPart = uEmail.includes("@") ? uEmail.split("@")[0] : uEmail;
      const uDisp = String(u.displayName || "").trim().toLowerCase();
      const uDispClean = uDisp.replace(/[^a-z0-9]/g, "");

      let isMatch = false;

      // Match 1: exact email
      if (uEmail && uEmail === typedLower) {
        isMatch = true;
      }
      // Match 2: exact display name
      else if (uDisp && uDisp === typedLower) {
        isMatch = true;
      }
      // Match 3: clean alphanumeric display name (e.g. "Andre Fonseca" <-> "andrefonseca")
      else if (uDispClean && uDispClean === typedClean) {
        isMatch = true;
      }
      // Match 4: typed matches user part of email (e.g. "emailparasiteslixo" <-> "emailparasiteslixo@gmail.com")
      else if (uEmailPart && uEmailPart === typedLower) {
        isMatch = true;
      }
      else if (uEmailPart && uEmailPart === typedClean) {
        isMatch = true;
      }
      // Match 5: name matches as a prefix (case-insensitive) of display name, or display name matches as a prefix of typed (min length 3)
      else if (uDisp && typedLower.length >= 3 && (uDisp.startsWith(typedLower) || typedLower.startsWith(uDisp))) {
        isMatch = true;
      }
      // Match 6: check alternative display names compiled during integration mapping
      else if (u.altDisplayNames && u.altDisplayNames.length > 0) {
        for (const alt of u.altDisplayNames) {
          const altLower = String(alt || "").trim().toLowerCase();
          const altClean = altLower.replace(/[^a-z0-9]/g, "");
          if (
            altLower === typedLower || 
            altClean === typedClean || 
            (typedLower.length >= 3 && (altLower.startsWith(typedLower) || typedLower.startsWith(altLower)))
          ) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) {
        // Now check if password matches
        const uPass = String(u.password || "").trim();
        // Fallback default password if user doesn't have password set in any collection
        const passwordToCompare = uPass || "123456"; 

        console.log(`[Local Signin Debug] Checking password for: ${uDisp} (${uEmail}). Stored pass: "${uPass}", Compare pass: "${passwordToCompare}", Clean password typed: "${cleanPassword}"`);

        if (cleanPassword === passwordToCompare) {
          console.log(`[Local Signin Debug] Passwords matched! Establishing user session.`);
          matchedUser = {
            uid: u.uid || `usr_${Math.random().toString(36).substring(2, 9)}`,
            email: u.email || `${u.uid}@segurtecpro.com`,
            displayName: u.displayName || uEmailPart || "Membro da Equipe",
            role: u.role || "tecnico",
            companyId: u.companyId || "default-company-id"
          };
          break;
        } else {
          console.log(`[Local Signin Debug] Password comparison failed.`);
        }
      }
    }

    if (!matchedUser) {
      return res.status(400).json({ error: "Usuário ou senha incorretos." });
    }

    res.json({
      uid: matchedUser.uid,
      email: matchedUser.email,
      displayName: matchedUser.displayName,
      role: matchedUser.role,
      companyId: matchedUser.companyId,
      emailVerified: true,
    });
  });

  async function autoSeedFirestore() {
    if (!isFirebaseInitialized || !canUseFirestore()) return;
    try {
      const dbObj = admin.firestore();
      const compsSnap = await dbObj.collection("companies").get();
      if (compsSnap.empty) {
        console.log("[Auto-Seed] Firestore is currently empty. Starting automatic database provisioning...");
        
        // 1. Seed companies
        try {
          const companiesPath = getSafeFileName("companies");
          const companies = readJSONFile(companiesPath);
          for (const c of companies) {
            const compRef = dbObj.collection("companies").doc(c.id || "default-company-id");
            const exists = (await compRef.get()).exists;
            if (!exists) {
              const cleaned = JSON.parse(JSON.stringify(c), (k, v) => {
                if (v && v.__type === 'Timestamp' && typeof v.seconds === 'number') {
                  return admin.firestore.Timestamp.fromMillis(v.seconds * 1000);
                }
                return v;
              });
              await compRef.set(cleaned);
              console.log(`[Auto-Seed] Seeded company: ${c.name}`);
            }
          }
        } catch (e: any) {
          console.warn("[Auto-Seed] Error seeding companies:", e.message);
        }

        // 2. Seed users
        try {
          const usersPath = getSafeFileName("users");
          const users = readJSONFile(usersPath);
          for (const u of users) {
            const userRef = dbObj.collection("users").doc(u.id || u.uid);
            const exists = (await userRef.get()).exists;
            if (!exists) {
              const cleaned = JSON.parse(JSON.stringify(u), (k, v) => {
                if (v && v.__type === 'Timestamp' && typeof v.seconds === 'number') {
                  return admin.firestore.Timestamp.fromMillis(v.seconds * 1000);
                }
                return v;
              });
              await userRef.set(cleaned);
              console.log(`[Auto-Seed] Seeded user profile: ${u.email || u.displayName}`);
            }
          }
        } catch (e: any) {
          console.warn("[Auto-Seed] Error seeding users:", e.message);
        }

        // 3. Seed default-company-id settings/roles
        try {
          const settingsPath = getSafeFileName("companies_default-company-id_settings");
          const settings = readJSONFile(settingsPath);
          if (settings && Object.keys(settings).length > 0) {
            const cleaned = JSON.parse(JSON.stringify(settings), (k, v) => {
              if (v && v.__type === 'Timestamp' && typeof v.seconds === 'number') {
                return admin.firestore.Timestamp.fromMillis(v.seconds * 1000);
              }
              return v;
            });
            
            await dbObj.collection("companies").doc("default-company-id").collection("settings").doc("roles").set(cleaned);
            console.log(`[Auto-Seed] Seeded company settings/roles`);
          }
        } catch (e: any) {
           console.warn("[Auto-Seed] Error seeding company settings:", e.message);
        }

        console.log("[Auto-Seed] Automatic database provisioning successfully completed.");
      }
    } catch (err: any) {
      console.error("[Auto-Seed] DB self-healing and seeding bypassed:", err.message);
    }
  }

  app.post("/api/auth/fallback-login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail/Usuário e senha são obrigatórios." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // 1. Gather all potential users from all databases (Local and Firestore)
    const mergedUsersMap = new Map<string, any>();

    // A. Read local auth_users.json
    try {
      const authUsersPath = getSafeFileName("auth_users");
      const authUsers = readJSONFile(authUsersPath);
      authUsers.forEach((u: any) => {
        const emailKey = String(u.email || "").trim().toLowerCase();
        const key = emailKey || String(u.displayName || "").trim().toLowerCase() || u.uid;
        if (key) {
          mergedUsersMap.set(key, {
            uid: u.uid || u.id,
            email: u.email || "",
            displayName: u.displayName || "",
            password: String(u.password || "").trim(),
            role: u.role || "",
            companyId: u.companyId || "",
            altDisplayNames: u.displayName ? [u.displayName] : []
          });
        }
      });
    } catch (e) {
      console.warn("Error reading local auth_users:", e);
    }

    // B. Read local users.json
    try {
      const usersPath = getSafeFileName("users");
      const users = readJSONFile(usersPath);
      users.forEach((u: any) => {
        const emailKey = String(u.email || "").trim().toLowerCase();
        const key = emailKey || String(u.displayName || "").trim().toLowerCase() || u.id;
        if (key) {
          if (mergedUsersMap.has(key)) {
            const existing = mergedUsersMap.get(key);
            if (u.password && String(u.password).trim()) {
              existing.password = String(u.password).trim();
            }
            if (u.role) {
              existing.role = u.role;
            }
            if (u.companyId) {
              existing.companyId = u.companyId;
            }
            if (u.displayName) {
              existing.altDisplayNames = existing.altDisplayNames || [];
              if (!existing.altDisplayNames.some((d: string) => d.toLowerCase() === u.displayName.toLowerCase())) {
                existing.altDisplayNames.push(u.displayName);
              }
            }
          } else {
            mergedUsersMap.set(key, {
              uid: u.id || u.uid,
              email: u.email || "",
              displayName: u.displayName || "",
              password: String(u.password || "").trim(),
              role: u.role || "tecnico",
              companyId: u.companyId || "default-company-id",
              altDisplayNames: u.displayName ? [u.displayName] : []
            });
          }
        }
      });
    } catch (e) {
      console.warn("Error reading local users file:", e);
    }

    // C. Read from Cloud Firestore 'users' collection (if active and configured)
    if (canUseFirestore()) {
      try {
        const usersRef = admin.firestore().collection("users");
        const snapshot = await usersRef.get();
        snapshot.docs.forEach(docSnap => {
          const u = docSnap.data();
          const emailKey = String(u.email || "").trim().toLowerCase();
          const key = emailKey || String(u.displayName || "").trim().toLowerCase() || docSnap.id;
          if (key) {
            if (mergedUsersMap.has(key)) {
              const existing = mergedUsersMap.get(key);
              if (u.password && String(u.password).trim()) {
                existing.password = String(u.password).trim();
              }
              if (u.role) {
                existing.role = u.role;
              }
              if (u.companyId) {
                existing.companyId = u.companyId;
              }
              if (u.displayName) {
                existing.altDisplayNames = existing.altDisplayNames || [];
                if (!existing.altDisplayNames.some((d: string) => d.toLowerCase() === u.displayName.toLowerCase())) {
                  existing.altDisplayNames.push(u.displayName);
                }
              }
            } else {
              mergedUsersMap.set(key, {
                uid: docSnap.id,
                email: u.email || "",
                displayName: u.displayName || "",
                password: String(u.password || "").trim(),
                role: u.role || "tecnico",
                companyId: u.companyId || "default-company-id",
                altDisplayNames: u.displayName ? [u.displayName] : []
              });
            }
          }
        });
      } catch (err: any) {
        const errMsg = String(err?.message || err || "");
        if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Cloud Firestore API") || errMsg.includes("disabled")) {
          isFirestoreEnabled = false;
          console.log("[Firebase Admin] Cloud Firestore API is disabled or unconfigured in Cloud console. Disabling Cloud database fallback integration.");
        } else {
          console.log("[Fallback Auth Debug] Firestore users collection check bypassed:", errMsg);
        }
      }
    }

    // Convert map to array for comparison
    const allUnifiedUsers = Array.from(mergedUsersMap.values());
    console.log("[Fallback Auth Debug] Unified users compiled:", JSON.stringify(allUnifiedUsers, null, 2));
    console.log("[Fallback Auth Debug] Request inputs:", { email, password: "...", typedRaw: String(email).trim() });

    // 2. Perform intelligent matching logic
    const typedRaw = String(email).trim();
    const typedLower = typedRaw.toLowerCase();
    const typedClean = typedLower.replace(/[^a-z0-9]/g, ""); // e.g. "andrefonseca"
    const typedUserPart = typedLower.includes("@") ? typedLower.split("@")[0] : typedLower;

    let matchedUser = null;

    for (const u of allUnifiedUsers) {
      const uEmail = String(u.email || "").trim().toLowerCase();
      const uEmailPart = uEmail.includes("@") ? uEmail.split("@")[0] : uEmail;
      const uDisp = String(u.displayName || "").trim().toLowerCase();
      const uDispClean = uDisp.replace(/[^a-z0-9]/g, "");

      let isMatch = false;

      // Match 1: exact email
      if (uEmail && uEmail === typedLower) {
        isMatch = true;
      }
      // Match 2: exact display name
      else if (uDisp && uDisp === typedLower) {
        isMatch = true;
      }
      // Match 3: clean alphanumeric display name (e.g. "Andre Fonseca" <-> "andrefonseca")
      else if (uDispClean && uDispClean === typedClean) {
        isMatch = true;
      }
      // Match 4: typed matches user part of email (e.g. "emailparasiteslixo" <-> "emailparasiteslixo@gmail.com")
      else if (uEmailPart && uEmailPart === typedLower) {
        isMatch = true;
      }
      else if (uEmailPart && uEmailPart === typedClean) {
        isMatch = true;
      }
      // Match 5: name matches as a prefix (case-insensitive) of display name, or display name matches as a prefix of typed (min length 3)
      else if (uDisp && typedLower.length >= 3 && (uDisp.startsWith(typedLower) || typedLower.startsWith(uDisp))) {
        isMatch = true;
      }
      // Match 6: check alternative display names compiled during integration mapping
      else if (u.altDisplayNames && u.altDisplayNames.length > 0) {
        for (const alt of u.altDisplayNames) {
          const altLower = String(alt || "").trim().toLowerCase();
          const altClean = altLower.replace(/[^a-z0-9]/g, "");
          if (
            altLower === typedLower || 
            altClean === typedClean || 
            (typedLower.length >= 3 && (altLower.startsWith(typedLower) || typedLower.startsWith(altLower)))
          ) {
            isMatch = true;
            break;
          }
        }
      }

      console.log(`[Fallback Auth Debug] Checked user: "${uDisp}" (${uEmail}). isMatch=${isMatch}`);

      if (isMatch) {
        // Now check if password matches
        const uPass = String(u.password || "").trim();
        // Fallback default password if user doesn't have password set in any collection (e.g., social logins who are trying layout logins)
        const passwordToCompare = uPass || "123456"; 

        console.log(`[Fallback Auth Debug] Checking password for: "${uDisp}" (${uEmail}). Stored pass: "${uPass}", Compare pass: "${passwordToCompare}", Clean password typed: "${cleanPassword}"`);

        if (cleanPassword === passwordToCompare) {
          console.log(`[Fallback Auth Debug] Passwords matched! Establishing user session.`);
          matchedUser = {
            uid: u.uid || `usr_${Math.random().toString(36).substring(2, 9)}`,
            email: u.email || `${u.uid}@segurtecpro.com`,
            displayName: u.displayName || uEmailPart || "Membro da Equipe",
            role: u.role || "tecnico",
            companyId: u.companyId || "default-company-id",
          };
          break;
        } else {
          console.log(`[Fallback Auth Debug] Password comparison failed.`);
        }
      }
    }

    // 3. If standard database search did not match, try the original Identity Toolkit API REST endpoint (just in case they exist only in Auth and we are on an active internet link)
    if (!matchedUser) {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      let apiKey = "";
      try {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          apiKey = config.apiKey || "";
        }
      } catch (err) {
        console.warn("Failed to load Web API key for REST fallback check:", err);
      }

      if (apiKey) {
        // Build candidate emails if not explicitly an email
        const emailCandidates: string[] = [];
        if (typedLower.includes("@")) {
          emailCandidates.push(typedLower);
        } else {
          if (typedClean) {
            emailCandidates.push(`${typedClean}@segurtecpro.com`);
            emailCandidates.push(`${typedClean}@segurpro.com`);
          }
        }

        for (const candEmail of emailCandidates) {
          try {
            const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: candEmail,
                password: cleanPassword,
                returnSecureToken: true
              })
            });

            if (response.ok) {
              const resData: any = await response.json();
              matchedUser = {
                uid: resData.localId,
                email: resData.email || candEmail,
                displayName: resData.displayName || candEmail.split('@')[0],
                role: "tecnico",
                companyId: "default-company-id",
              };
              // Try to find supplementary role/companyId for this verified user
              const localUserMeta = Array.from(mergedUsersMap.values()).find((lu: any) => lu.uid === matchedUser.uid || lu.email.toLowerCase() === matchedUser.email.toLowerCase());
              if (localUserMeta) {
                if (localUserMeta.role) matchedUser.role = localUserMeta.role;
                if (localUserMeta.companyId) matchedUser.companyId = localUserMeta.companyId;
              }
              console.log(`Fallback login: REST API validated credentials for: ${candEmail}`);

              // Back-sync validated credentials to our local file so offline fallback knows it immediately
              try {
                const authUsersPath = getSafeFileName("auth_users");
                const authUsers = readJSONFile(authUsersPath);
                const existingIdx = authUsers.findIndex(u => u.email.toLowerCase() === candEmail.toLowerCase());
                if (existingIdx === -1) {
                  authUsers.push({
                    uid: resData.localId,
                    email: candEmail,
                    password: cleanPassword,
                    displayName: matchedUser.displayName
                  });
                  writeJSONFile(authUsersPath, authUsers);
                } else if (authUsers[existingIdx].password !== cleanPassword) {
                  authUsers[existingIdx].password = cleanPassword;
                  writeJSONFile(authUsersPath, authUsers);
                }
              } catch (syncErr: any) {
                console.warn("Back-sync of REST-verified account failed:", syncErr);
              }
              break;
            }
          } catch (restErr: any) {
            console.warn(`REST fallback check failed for ${candEmail}:`, restErr.message || restErr);
          }
        }
      }
    }

    if (matchedUser) {
      // Generate custom token if possible
      let customToken = null;
      if (canUseFirebaseAuth()) {
        try {
          // Verify or create/update the user in Firebase Auth with correct email and displayName
          try {
            const authUser = await admin.auth().getUser(matchedUser.uid);
            if (authUser.email !== matchedUser.email || authUser.displayName !== matchedUser.displayName) {
              await admin.auth().updateUser(matchedUser.uid, {
                email: matchedUser.email,
                displayName: matchedUser.displayName,
                emailVerified: true
              });
            }
          } catch (authErr: any) {
            if (authErr.code === 'auth/user-not-found') {
              await admin.auth().createUser({
                uid: matchedUser.uid,
                email: matchedUser.email,
                displayName: matchedUser.displayName,
                emailVerified: true
              });
            } else {
              console.log("[Firebase Admin Auth] Note: Auth user properties updates bypassed in this environment:", authErr?.message || authErr);
            }
          }

          customToken = await admin.auth().createCustomToken(matchedUser.uid, {
            email: matchedUser.email,
            role: matchedUser.role,
            companyId: matchedUser.companyId
          });
        } catch (tokenErr: any) {
          // Suppress raw GCP/Firebase custom token IAM/signBlob errors in logs, as the app cleanly falls back to secure client-side session simulation.
          console.log("Custom token bypassed (using secure client-side authentication fallback).", tokenErr?.message || tokenErr);
        }
      }

      console.log(`Merged Authentication success: Matched user ${matchedUser.displayName} (${matchedUser.email})`);
      
      // Seed Firebase Cloud Firestore asynchronously from JSON templates if empty
      autoSeedFirestore().catch(e => {
        console.warn("Background autoSeedFirestore failed:", e.message);
      });

      return res.json({
        success: true,
        customToken,
        user: matchedUser
      });
    } else {
      return res.status(401).json({
        error: "Credenciais inválidas. Verifique o nome/email e senha de equipe inseridos e tente novamente."
      });
    }
  });

  app.post("/api/localdb/auth/signup", (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const authUsersPath = getSafeFileName("auth_users");
    const authUsers = readJSONFile(authUsersPath);

    const exists = authUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "Este endereço de e-mail / usuário já está cadastrado." });
    }

    const uid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newUser = {
      uid,
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName || email.split("@")[0],
    };

    authUsers.push(newUser);
    writeJSONFile(authUsersPath, authUsers);

    // Seed metabolic profile inside users collection
    const usersPath = getSafeFileName("users");
    const users = readJSONFile(usersPath);
    users.push({
      id: uid,
      displayName: newUser.displayName,
      email: newUser.email,
      password: newUser.password,
      role: "tecnico",
      companyId: "default-company-id",
    });
    writeJSONFile(usersPath, users);

    const { password: _, ...cleanUser } = newUser;
    res.json({
      uid: cleanUser.uid,
      email: cleanUser.email,
      displayName: cleanUser.displayName,
      emailVerified: true,
    });
  });

  // --- CRUD REST endpoints for Local Dataset operations ---

  app.get("/api/localdb/:collection", async (req, res) => {
    const { collection } = req.params;
    try {
      if (canUseFirestore()) {
        const firestorePath = getFirestorePath(collection);
        console.log(`[Firestore Proxy GET] Fetching collection docs: ${firestorePath}`);
        const snapshot = await admin.firestore().collection(firestorePath).get();
        const data = snapshot.docs.map(docSnap => {
          return formatFirestoreDoc({ id: docSnap.id, ...docSnap.data() });
        });
        return res.json(data);
      }
    } catch (err: any) {
      console.error(`[Firestore Proxy GET Error] ${collection}:`, err?.message || err);
      console.warn("[Firestore Proxy Fallback] Disabling Firestore proxy due to API error. Falling back to local flat files.");
      isFirestoreEnabled = false;
    }

    // Flat file fallback
    const filePath = getSafeFileName(collection);
    const data = readJSONFile(filePath);
    res.json(data);
  });

  app.get("/api/localdb/:collection/:id", async (req, res) => {
    const { collection, id } = req.params;
    try {
      if (canUseFirestore()) {
        const firestorePath = getFirestorePath(collection);
        console.log(`[Firestore Proxy GET Doc] Fetching doc: ${firestorePath}/${id}`);
        const docSnap = await admin.firestore().collection(firestorePath).doc(id).get();
        if (docSnap.exists) {
          return res.json(formatFirestoreDoc({ id: docSnap.id, ...docSnap.data() }));
        } else {
          return res.status(404).json({ error: "Documento não encontrado no Firestore" });
        }
      }
    } catch (err: any) {
      console.error(`[Firestore Proxy GET Doc Error] ${collection}/${id}:`, err?.message || err);
      console.warn("[Firestore Proxy Fallback] Disabling Firestore proxy due to API error. Falling back to local flat files.");
      isFirestoreEnabled = false;
    }

    // Flat file fallback
    const filePath = getSafeFileName(collection);
    const data = readJSONFile(filePath);
    const found = data.find((item) => item.id === id);
    if (!found) {
      return res.status(404).json({ error: "Documento não encontrado na database local" });
    }
    res.json(found);
  });

  app.post("/api/localdb/:collection", async (req, res) => {
    const { collection } = req.params;
    const item = req.body;
    const docId = item.id || `doc_${Math.random().toString(36).substring(2, 9)}`;
    const cleanItem = { ...item, id: docId };

    try {
      if (canUseFirestore()) {
        const firestorePath = getFirestorePath(collection);
        console.log(`[Firestore Proxy POST] Creating doc: ${firestorePath}/${docId}`);
        const parsedItem = parseFirestoreDoc(cleanItem);
        await admin.firestore().collection(firestorePath).doc(docId).set(parsedItem);
        return res.json(cleanItem);
      }
    } catch (err: any) {
      console.error(`[Firestore Proxy POST Error] ${collection}:`, err?.message || err);
      console.warn("[Firestore Proxy Fallback] Disabling Firestore proxy due to API error. Falling back to local flat files.");
      isFirestoreEnabled = false;
    }

    // Flat file fallback
    const filePath = getSafeFileName(collection);
    const data = readJSONFile(filePath);
    data.push(cleanItem);
    writeJSONFile(filePath, data);
    res.json(cleanItem);
  });

  app.put("/api/localdb/:collection/:id", async (req, res) => {
    const { collection, id } = req.params;
    const item = req.body;
    const cleanItem = { ...item, id };

    try {
      if (canUseFirestore()) {
        const firestorePath = getFirestorePath(collection);
        console.log(`[Firestore Proxy PUT] Saving doc: ${firestorePath}/${id}`);
        const parsedItem = parseFirestoreDoc(cleanItem);
        await admin.firestore().collection(firestorePath).doc(id).set(parsedItem);
        return res.json(cleanItem);
      }
    } catch (err: any) {
      console.error(`[Firestore Proxy PUT Error] ${collection}/${id}:`, err?.message || err);
      console.warn("[Firestore Proxy Fallback] Disabling Firestore proxy due to API error. Falling back to local flat files.");
      isFirestoreEnabled = false;
    }

    // Flat file fallback
    const filePath = getSafeFileName(collection);
    let data = readJSONFile(filePath);
    const itemIndex = data.findIndex((item) => item.id === id);
    if (itemIndex >= 0) {
      data[itemIndex] = cleanItem;
    } else {
      data.push(cleanItem);
    }
    writeJSONFile(filePath, data);
    res.json(cleanItem);
  });

  app.patch("/api/localdb/:collection/:id", async (req, res) => {
    const { collection, id } = req.params;
    const updates = req.body;

    try {
      if (canUseFirestore()) {
        const firestorePath = getFirestorePath(collection);
        console.log(`[Firestore Proxy PATCH] Updating doc: ${firestorePath}/${id}`);
        const parsedUpdates = parseFirestoreDoc(updates);
        await admin.firestore().collection(firestorePath).doc(id).update(parsedUpdates);
        
        const docSnap = await admin.firestore().collection(firestorePath).doc(id).get();
        return res.json(formatFirestoreDoc({ id: docSnap.id, ...docSnap.data() }));
      }
    } catch (err: any) {
      console.error(`[Firestore Proxy PATCH Error] ${collection}/${id}:`, err?.message || err);
      console.warn("[Firestore Proxy Fallback] Disabling Firestore proxy due to API error. Falling back to local flat files.");
      isFirestoreEnabled = false;
    }

    // Flat file fallback
    const filePath = getSafeFileName(collection);
    let data = readJSONFile(filePath);
    const itemIndex = data.findIndex((item) => item.id === id);
    if (itemIndex < 0) {
      return res.status(404).json({ error: "Documento não encontrado para modificação" });
    }
    data[itemIndex] = { ...data[itemIndex], ...updates };
    writeJSONFile(filePath, data);
    res.json(data[itemIndex]);
  });

  app.delete("/api/localdb/:collection/:id", async (req, res) => {
    const { collection, id } = req.params;

    try {
      if (canUseFirestore()) {
        const firestorePath = getFirestorePath(collection);
        console.log(`[Firestore Proxy DELETE] Deleting doc: ${firestorePath}/${id}`);
        await admin.firestore().collection(firestorePath).doc(id).delete();
        return res.json({ success: true });
      }
    } catch (err: any) {
      console.error(`[Firestore Proxy DELETE Error] ${collection}/${id}:`, err?.message || err);
      console.warn("[Firestore Proxy Fallback] Disabling Firestore proxy due to API error. Falling back to local flat files.");
      isFirestoreEnabled = false;
    }

    // Flat file fallback
    const filePath = getSafeFileName(collection);
    const data = readJSONFile(filePath);
    const filtered = data.filter((item) => item.id !== id);
    writeJSONFile(filePath, filtered);
    res.json({ success: true });
  });

  // --- Cloud/Local Unified Restore Points Endpoints ---

  app.post("/api/backup/save-restore-point", (req, res) => {
    try {
      const { companyId, description, createdBy, data } = req.body;
      if (!companyId || !description) {
        return res.status(400).json({ error: "companyId e descrição são obrigatórios." });
      }
      const restorePointsDir = path.join(DATA_DIR, "restore_points");
      if (!fs.existsSync(restorePointsDir)) {
        fs.mkdirSync(restorePointsDir, { recursive: true });
      }
      const pointId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const fileName = `companies_${companyId}_restore_points_${pointId}.json`;
      const filePath = path.join(restorePointsDir, fileName);
      
      const pointDoc = {
        id: pointId,
        description,
        createdAt: new Date().toISOString(),
        createdBy: createdBy || "Administrador",
        data
      };
      
      fs.writeFileSync(filePath, JSON.stringify(pointDoc, null, 2), "utf-8");
      res.json({ success: true, point: { id: pointId, description, createdAt: pointDoc.createdAt, createdBy: pointDoc.createdBy } });
    } catch (err: any) {
      console.error("Error saving cloud restore point:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/backup/restore-points/:companyId", (req, res) => {
    try {
      const { companyId } = req.params;
      if (!companyId) {
        return res.status(400).json({ error: "companyId é obrigatório." });
      }
      const restorePointsDir = path.join(DATA_DIR, "restore_points");
      if (!fs.existsSync(restorePointsDir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(restorePointsDir);
      const points: any[] = [];
      const prefix = `companies_${companyId}_restore_points_`;
      for (const file of files) {
        if (file.startsWith(prefix) && file.endsWith(".json")) {
          try {
            const raw = fs.readFileSync(path.join(restorePointsDir, file), "utf-8");
            const docData = JSON.parse(raw);
            points.push({
              id: docData.id,
              description: docData.description,
              createdAt: docData.createdAt,
              createdBy: docData.createdBy
            });
          } catch (e) {
             console.error("Error parsing restore point file:", file, e);
          }
        }
      }
      points.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(points);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/backup/restore-points/:companyId/:pointId", (req, res) => {
    try {
      const { companyId, pointId } = req.params;
      const restorePointsDir = path.join(DATA_DIR, "restore_points");
      const fileName = `companies_${companyId}_restore_points_${pointId}.json`;
      const filePath = path.join(restorePointsDir, fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Ponto de restauração não encontrado." });
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      res.json(JSON.parse(raw));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/backup/restore-points/:companyId/:pointId", (req, res) => {
    try {
      const { companyId, pointId } = req.params;
      const restorePointsDir = path.join(DATA_DIR, "restore_points");
      const fileName = `companies_${companyId}_restore_points_${pointId}.json`;
      const filePath = path.join(restorePointsDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Administrative User Synclayers Auth Override ---

  app.get("/api/admin/user-password/:uid", async (req, res) => {
    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({ error: "UID is required." });
    }
    const authUsersPath = getSafeFileName("auth_users");
    const authUsers = readJSONFile(authUsersPath);
    const user = authUsers.find(u => u.uid === uid);
    if (user && user.password) {
      return res.json({ success: true, password: user.password });
    }

    // Try checking the Firestore users collection as hybrid database backup
    if (canUseFirestore()) {
      try {
        const docRef = admin.firestore().collection("users").doc(uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const udata = docSnap.data();
          if (udata && udata.password) {
            return res.json({ success: true, password: udata.password });
          }
        }
      } catch (fsErr: any) {
        const errMsg = String(fsErr?.message || fsErr || "");
        if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Cloud Firestore API") || errMsg.includes("disabled")) {
          isFirestoreEnabled = false;
        }
        console.log("[Firebase Admin] Firestore password backup check bypassed (Firestore API disabled or unconfigured in Cloud console).");
      }
    }
    res.json({ success: false, message: "Senha não encontrada no cadastro local ou ambiente em nuvem real." });
  });

  app.get("/api/auth/user-profile/:uidOrEmail", async (req, res) => {
    const { uidOrEmail } = req.params;
    if (!uidOrEmail) {
      return res.status(400).json({ success: false, error: "UID or Email is required." });
    }

    const cleanInput = String(uidOrEmail).replace(/[^a-zA-Z0-9@._-]/g, "").trim().toLowerCase();

    // 1. Compile merged map of users just like fallback-login
    const mergedUsersMap = new Map<string, any>();

    // A. Read local auth_users.json
    try {
      const authUsersPath = getSafeFileName("auth_users");
      const authUsers = readJSONFile(authUsersPath);
      authUsers.forEach((u: any) => {
        const emailKey = String(u.email || "").trim().toLowerCase();
        const key = emailKey || String(u.displayName || "").trim().toLowerCase() || u.uid;
        if (key) {
          mergedUsersMap.set(key, {
            uid: u.uid || u.id,
            email: u.email || "",
            displayName: u.displayName || "",
            role: u.role || "tecnico",
            companyId: u.companyId || "default-company-id",
          });
        }
      });
    } catch (e) {
      console.warn("Error reading local auth_users:", e);
    }

    // B. Read local users.json
    try {
      const usersPath = getSafeFileName("users");
      const users = readJSONFile(usersPath);
      users.forEach((u: any) => {
        const emailKey = String(u.email || "").trim().toLowerCase();
        const key = emailKey || String(u.displayName || "").trim().toLowerCase() || u.id;
        if (key) {
          if (mergedUsersMap.has(key)) {
            const existing = mergedUsersMap.get(key);
            if (u.role) existing.role = u.role;
            if (u.companyId) existing.companyId = u.companyId;
            if (u.displayName) existing.displayName = u.displayName;
          } else {
            mergedUsersMap.set(key, {
              uid: u.id || u.uid,
              email: u.email || "",
              displayName: u.displayName || "",
              role: u.role || "tecnico",
              companyId: u.companyId || "default-company-id",
            });
          }
        }
      });
    } catch (e) {
      console.warn("Error reading local users file:", e);
    }

    // C. Read from Cloud Firestore 'users' collection (if active and configured)
    if (canUseFirestore()) {
      try {
        const usersRef = admin.firestore().collection("users");
        const snapshot = await usersRef.get();
        snapshot.docs.forEach(docSnap => {
          const u = docSnap.data();
          const emailKey = String(u.email || "").trim().toLowerCase();
          const key = emailKey || String(u.displayName || "").trim().toLowerCase() || docSnap.id;
          if (key) {
            if (mergedUsersMap.has(key)) {
              const existing = mergedUsersMap.get(key);
              if (u.role) existing.role = u.role;
              if (u.companyId) existing.companyId = u.companyId;
              if (u.displayName) existing.displayName = u.displayName;
            } else {
              mergedUsersMap.set(key, {
                uid: docSnap.id,
                email: u.email || "",
                displayName: u.displayName || "",
                role: u.role || "tecnico",
                companyId: u.companyId || "default-company-id",
              });
            }
          }
        });
      } catch (err: any) {
        console.log("[User Profile Info API] Firestore users retrieval bypassed:", err?.message);
      }
    }

    const allUnifiedUsers = Array.from(mergedUsersMap.values());
    const cleanInputAlphanumeric = cleanInput.replace(/[^a-z0-9]/g, "");
    const matched = allUnifiedUsers.find((u: any) => {
      const uUid = String(u.uid || "").toLowerCase();
      const uEmail = String(u.email || "").toLowerCase();
      const uDisp = String(u.displayName || "").toLowerCase();
      const uDispClean = uDisp.replace(/[^a-z0-9]/g, "");
      
      return (
        uUid === cleanInput ||
        uEmail === cleanInput ||
        uDisp === cleanInput ||
        (uDispClean && uDispClean === cleanInputAlphanumeric) ||
        uEmail.startsWith(cleanInput)
      );
    });

    if (matched) {
      return res.json({ success: true, user: matched });
    }

    // Secondary fallback search inside Firestore directly by UID
    if (canUseFirestore()) {
      try {
        const docRef = admin.firestore().collection("users").doc(uidOrEmail);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const u = docSnap.data();
          if (u) {
            return res.json({
              success: true,
              user: {
                uid: docSnap.id,
                email: u.email || "",
                displayName: u.displayName || "",
                role: u.role || "tecnico",
                companyId: u.companyId || "default-company-id"
              }
            });
          }
        }
      } catch (err) {
        // Ignore
      }
    }

    res.status(404).json({ success: false, error: "Profile not found" });
  });

  app.post("/api/admin/update-user-password", async (req, res) => {
    const { uid, newPassword, newEmail } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: "UID is required." });
    }

    const isLocalDb = process.env.VITE_LOCAL_DB === 'true';

    // Helper function to sync with local files
    const updateLocalFlatFile = () => {
      const authUsersPath = getSafeFileName("auth_users");
      const authUsers = readJSONFile(authUsersPath);
      const userIndex = authUsers.findIndex(u => u.uid === uid);
      if (userIndex >= 0) {
        if (newPassword) authUsers[userIndex].password = newPassword;
        if (newEmail) authUsers[userIndex].email = newEmail.trim().toLowerCase();
        writeJSONFile(authUsersPath, authUsers);
        return { success: true, created: false };
      } else {
        const usersPath = getSafeFileName("users");
        const users = readJSONFile(usersPath);
        const userMeta = users.find((u: any) => u.id === uid);
        const emailToUse = newEmail || userMeta?.email || `${uid}@local.com`;
        
        authUsers.push({
          uid,
          email: emailToUse.trim().toLowerCase(),
          password: newPassword || "123456",
          displayName: userMeta?.displayName || "Usuário"
        });
        writeJSONFile(authUsersPath, authUsers);
        return { success: true, created: true };
      }
    };

    if (isLocalDb || !canUseFirebaseAuth()) {
      const resLocal = updateLocalFlatFile();
      return res.json({ 
        success: true, 
        message: resLocal.created 
          ? "Cadastro login local criado e atualizado com sucesso." 
          : "Cadastro login local atualizado com sucesso." 
      });
    }

    // Standard Firebase Auth branch (Cloud), with hybrid fallback if Identity Toolkit API is disabled
    try {
      const updateParams: any = {};
      if (newPassword) {
        updateParams.password = newPassword;
      }
      if (newEmail) {
        updateParams.email = newEmail.trim().toLowerCase();
      }

      if (Object.keys(updateParams).length > 0) {
        await admin.auth().updateUser(uid, updateParams);
      }
      
      // Keep local flat file in sync for double safety (so we can read it on UI checks and queries)
      updateLocalFlatFile();
      
      // Update Firestore user doc with standard fields
      if (canUseFirestore()) {
        try {
          const userDocRef = admin.firestore().collection('users').doc(uid);
          const updateObj: any = {};
          if (newPassword) updateObj.password = newPassword;
          if (newEmail) updateObj.email = newEmail.trim().toLowerCase();
          await userDocRef.set(updateObj, { merge: true });
        } catch (fError: any) {
          const errMsg = String(fError?.message || fError || "");
          if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Cloud Firestore API") || errMsg.includes("disabled")) {
            isFirestoreEnabled = false;
          }
          console.log("[Firebase Admin] Firestore password updater bypassed (Firestore API disabled or unconfigured).");
        }
      }

      res.json({ success: true, message: "Cadastro e senha atualizados com sucesso." });
    } catch (error: any) {
      const errMsg = error.message || "";
      const isIdentityToolkitDisabled = 
        errMsg.includes("Identity Toolkit API") || 
        errMsg.includes("identitytoolkit.googleapis.com") || 
        errMsg.includes("PERMISSION_DENIED") ||
        errMsg.includes("accessNotConfigured") ||
        (error.code && error.code.includes("internal-error")) ||
        (error.code && error.code.includes("permission-denied"));

      if (isIdentityToolkitDisabled) {
        console.log("GCP Identity Toolkit API not configuration active. Employing Firestore and local credential store hybrid backup instead.");
      } else {
        console.log("Could not update auth credentials via Firebase Admin SDK. Falling back to local/Firestore storage strategy.", errMsg);
      }

      if (isIdentityToolkitDisabled) {
        // Yes, the Identity Toolkit API is disabled in this GCP environment.
        // Let's run the local disk sync, AND ALSO perform a clean update on the Firestore users collection
        // so that the password and settings are stored persistently in their database.
        updateLocalFlatFile();
        
        let dbSyncSuccess = false;
        if (canUseFirestore()) {
          try {
            const userDocRef = admin.firestore().collection('users').doc(uid);
            const updateObj: any = {};
            if (newPassword) updateObj.password = newPassword;
            if (newEmail) updateObj.email = newEmail.trim().toLowerCase();
            await userDocRef.set(updateObj, { merge: true });
            dbSyncSuccess = true;
            console.log("Fallback: Credentials updated in Firestore user record successfully.");
          } catch (fsErr: any) {
            const fsMsg = String(fsErr?.message || fsErr || "");
            if (fsMsg.includes("PERMISSION_DENIED") || fsMsg.includes("Cloud Firestore API") || fsMsg.includes("disabled")) {
              isFirestoreEnabled = false;
            }
            console.log("[Firebase Admin] Fallback: Firestore credentials save bypassed (Firestore API disabled on GCP or unconfigured).");
          }
        }

        return res.json({ 
          success: true, 
          fallback: true,
          message: dbSyncSuccess
            ? "Senha atualizada alternativamente na base de dados principal (Nuvem Firestore) com sucesso! (GCP Identity Toolkit inativo)"
            : "Senha atualizada alternativamente na base de dados local com sucesso! (GCP Identity Toolkit inativo)"
        });
      }

      // If it's another critical error, we still try the local flat file fallback
      updateLocalFlatFile();
      res.json({
        success: true,
        fallback: true,
        message: "Dados atualizados localmente (ocorreu uma restrição temporária no provedor em nuvem Auth)."
      });
    }
  });

  app.post("/api/admin/sync-local-user", (req, res) => {
    const { uid, email, displayName, password, role, companyId } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: "UID and Email are required for sync." });
    }

    // 1. Write to auth_users.json
    try {
      const authUsersPath = getSafeFileName("auth_users");
      const authUsers = readJSONFile(authUsersPath);
      const cleanEmail = String(email).trim().toLowerCase();
      const cleanPassword = String(password || "123456").trim();
      const existingIdx = authUsers.findIndex(u => u.uid === uid || u.email.toLowerCase() === cleanEmail);

      if (existingIdx >= 0) {
        authUsers[existingIdx].uid = uid;
        authUsers[existingIdx].email = cleanEmail;
        authUsers[existingIdx].password = cleanPassword;
        if (displayName) authUsers[existingIdx].displayName = displayName;
      } else {
        authUsers.push({
          uid,
          email: cleanEmail,
          password: cleanPassword,
          displayName: displayName || email.split('@')[0]
        });
      }
      writeJSONFile(authUsersPath, authUsers);
    } catch (err) {
      console.warn("Failed to sync into auth_users.json:", err);
    }

    // 2. Write to users.json (the team's collection in flat-file database)
    try {
      const usersPath = getSafeFileName("users");
      const users = readJSONFile(usersPath);
      const cleanEmail = String(email).trim().toLowerCase();
      const cleanPassword = String(password || "123456").trim();
      const existingIdx = users.findIndex(u => (u.id === uid || u.uid === uid) || (u.email && u.email.toLowerCase() === cleanEmail));

      if (existingIdx >= 0) {
        users[existingIdx].id = uid;
        users[existingIdx].uid = uid;
        users[existingIdx].email = cleanEmail;
        users[existingIdx].password = cleanPassword;
        users[existingIdx].role = role || users[existingIdx].role || "tecnico";
        if (companyId) users[existingIdx].companyId = companyId;
        if (displayName) users[existingIdx].displayName = displayName;
      } else {
        users.push({
          id: uid,
          uid,
          email: cleanEmail,
          password: cleanPassword,
          displayName: displayName || email.split('@')[0],
          role: role || "tecnico",
          companyId: companyId || "default-company-id",
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0, __type: "Timestamp" }
        });
      }
      writeJSONFile(usersPath, users);
    } catch (err) {
      console.warn("Failed to sync into users.json:", err);
    }

    // 3. Write to Firestore 'users' collection too (if initialized and active)
    if (canUseFirestore()) {
      try {
        admin.firestore().collection("users").doc(uid).set({
          uid,
          email: email.trim().toLowerCase(),
          password: password || "123456",
          displayName: displayName || email.split('@')[0],
          role: role || "tecnico",
          companyId: companyId || "default-company-id",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (fErr: any) {
        const errMsg = String(fErr?.message || fErr || "");
        if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Cloud Firestore API") || errMsg.includes("disabled")) {
          isFirestoreEnabled = false;
        }
        console.log("[Firebase Admin] Firestore sync during direct register bypassed (Firestore API disabled or unconfigured).");
      }
    }

    res.json({ success: true, message: "User credentials successfully synchronized with server local database flat-files." });
  });

  app.post("/api/admin/delete-user", async (req, res) => {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: "UID is required." });
    }

    const isLocalDb = process.env.VITE_LOCAL_DB === 'true';

    const deleteLocalFlatFile = () => {
      const authUsersPath = getSafeFileName("auth_users");
      const authUsers = readJSONFile(authUsersPath);
      const filtered = authUsers.filter(u => u.uid !== uid);
      writeJSONFile(authUsersPath, filtered);

      const usersPath = getSafeFileName("users");
      const users = readJSONFile(usersPath);
      const filteredUsers = users.filter((u: any) => u.id !== uid && u.uid !== uid);
      writeJSONFile(usersPath, filteredUsers);
    };

    if (isLocalDb || !canUseFirebaseAuth()) {
      deleteLocalFlatFile();
      return res.json({ success: true, message: "Usuário excluído com sucesso do login local." });
    }

    try {
      await admin.auth().deleteUser(uid);
      
      // Delete locally as well for double safety
      deleteLocalFlatFile();

      // Try to delete from Firestore users collection
      if (canUseFirestore()) {
        try {
          await admin.firestore().collection('users').doc(uid).delete();
        } catch (fError: any) {
          const errMsg = String(fError?.message || fError || "");
          if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Cloud Firestore API") || errMsg.includes("disabled")) {
            isFirestoreEnabled = false;
          }
          console.log("[Firebase Admin] Firestore user deletion bypassed (Firestore API disabled or unconfigured).");
        }
      }

      res.json({ success: true, message: "Usuário excluído com sucesso." });
    } catch (error: any) {
      const errMsg = error.message || "";
      const isIdentityToolkitDisabled = 
        errMsg.includes("Identity Toolkit API") || 
        errMsg.includes("identitytoolkit.googleapis.com") || 
        errMsg.includes("PERMISSION_DENIED") ||
        errMsg.includes("accessNotConfigured") ||
        (error.code && error.code.includes("internal-error")) ||
        (error.code && error.code.includes("permission-denied"));

      if (isIdentityToolkitDisabled) {
        console.log("Identity Toolkit API not active on GCP project. Silently executing local and Firestore fallback user deletion.");
      } else {
        console.log("Authentication deleteUser capability unreached. Executing fallback local and Firestore deletion.", errMsg);
      }

      if (isIdentityToolkitDisabled) {
        deleteLocalFlatFile();
        
        // Also try to delete from Firestore doc just in case
        if (canUseFirestore()) {
          try {
            await admin.firestore().collection('users').doc(uid).delete();
          } catch (fsErr: any) {
            const fsMsg = String(fsErr?.message || fsErr || "");
            if (fsMsg.includes("PERMISSION_DENIED") || fsMsg.includes("Cloud Firestore API") || fsMsg.includes("disabled")) {
              isFirestoreEnabled = false;
            }
            console.log("[Firebase Admin] Fallback delete from Firestore doc bypassed (Firestore API disabled on GCP or unconfigured).");
          }
        }

        return res.json({
          success: true,
          fallback: true,
          message: "Usuário excluído alternativamente da base local (GCP Identity Toolkit inativo)."
        });
      }

      // Default fallback
      deleteLocalFlatFile();
      res.json({
        success: true,
        fallback: true,
        message: "Usuário excluído localmente devido a restrições temporárias no provedor em nuvem."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
