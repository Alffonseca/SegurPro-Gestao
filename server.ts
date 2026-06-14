import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import fs from "fs";

// Safe initialization of Firebase Admin to avoid crashes in Local DB mode
let isFirebaseInitialized = false;
try {
  // If we are explicitly in Local DB mode, we don't need Firebase admin
  if (process.env.VITE_LOCAL_DB !== 'true') {
    admin.initializeApp();
    isFirebaseInitialized = true;
    console.log("Firebase Admin successfully initialized.");
  } else {
    console.log("Firebase Admin bypassed - Running in Local DB mode.");
  }
} catch (err) {
  console.log("Firebase Admin could not be auto-initialized, falling back to local database operations.", err);
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

    // 3. Seed Companies
    const companiesPath = getSafeFileName("companies");
    const companies = readJSONFile(companiesPath);
    if (!companies.some(c => c.id === "default-company-id")) {
      companies.push({
        id: "default-company-id",
        name: "AF Suporte Técnico em Seg. e Inf.",
        ownerId: "emailparasiteslixo-id",
        status: "active",
        inviteCode: "MASTER",
        createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
      });
      writeJSONFile(companiesPath, companies);
    }

    // 4. Seed Company Settings inside nested collection companies/default-company-id/settings
    const compSettingsPath = getSafeFileName("companies_default-company-id_settings");
    const compSettings = readJSONFile(compSettingsPath);
    if (!compSettings.some(s => s.id === "general")) {
      compSettings.push({
        id: "general",
        companyName: "AF Suporte Técnico em Seg. e Inf.",
        createdAt: { seconds: 1779900000, nanoseconds: 0, __type: "Timestamp" }
      });
      writeJSONFile(compSettingsPath, compSettings);
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
    companies.push({
      id: "default-company-id",
      name: "AF Suporte Técnico em Seg. e Inf.",
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

    const authUsersPath = getSafeFileName("auth_users");
    const authUsers = readJSONFile(authUsersPath);

    let foundAuth = authUsers.find(
      (u) =>
        (u.email.toLowerCase() === email.toLowerCase() ||
         u.displayName.toLowerCase().trim() === email.toLowerCase().trim() ||
         u.email.toLowerCase().split('@')[0] === email.toLowerCase().trim()) &&
        String(u.password) === String(password)
    );

    let matchedUser = null;

    if (foundAuth) {
      matchedUser = {
        uid: foundAuth.uid,
        email: foundAuth.email,
        displayName: foundAuth.displayName,
      };
    } else {
      // Check the Equipe database (users.json) as requested
      const usersPath = getSafeFileName("users");
      const users = readJSONFile(usersPath);
      const foundUserMeta = users.find(
        (u: any) =>
          u.password &&
          String(u.password) === String(password) &&
          ((u.email && u.email.toLowerCase() === email.toLowerCase()) ||
           (u.displayName && u.displayName.toLowerCase().trim() === email.toLowerCase().trim()) ||
           (u.email && u.email.toLowerCase().split('@')[0] === email.toLowerCase().trim()))
      );

      if (foundUserMeta) {
        matchedUser = {
          uid: foundUserMeta.id || foundUserMeta.uid,
          email: foundUserMeta.email,
          displayName: foundUserMeta.displayName,
        };
      }
    }

    if (!matchedUser) {
      return res.status(400).json({ error: "Usuário ou senha incorretos." });
    }

    res.json({
      uid: matchedUser.uid,
      email: matchedUser.email,
      displayName: matchedUser.displayName,
      emailVerified: true,
    });
  });

  app.post("/api/auth/fallback-login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail/Usuário e senha são obrigatórios." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailCandidates: string[] = [];

    if (cleanEmail.includes("@")) {
      if (!cleanEmail.startsWith("@") && !cleanEmail.endsWith("@")) {
        emailCandidates.push(cleanEmail);
      }
    } else {
      const cleanUser = cleanEmail.replace(/[^a-z0-9._-]/g, "");
      if (cleanUser) {
        emailCandidates.push(`${cleanUser}@segurtecpro.com`);
        emailCandidates.push(`${cleanUser}@segurpro.com`);
      }
    }

    if (emailCandidates.length === 0) {
      return res.status(400).json({ error: "E-mail ou usuário em formato inválido." });
    }

    let matchedUser = null;

    // Check flat-file auth_users
    try {
      const authUsersPath = getSafeFileName("auth_users");
      const authUsers = readJSONFile(authUsersPath);
      const localUser = authUsers.find(
        (u) =>
          emailCandidates.map(e => e.toLowerCase()).includes(u.email.toLowerCase()) &&
          String(u.password) === String(password)
      );
      if (localUser) {
        matchedUser = {
          uid: localUser.uid,
          email: localUser.email,
          displayName: localUser.displayName || "Usuário",
        };
      }
    } catch (err) {
      console.warn("Local flat file credentials check error:", err);
    }

    // Check local users metadata flat file (Equipe database)
    if (!matchedUser) {
      try {
        const usersPath = getSafeFileName("users");
        const users = readJSONFile(usersPath);
        const localUserMeta = users.find(
          (u: any) =>
            u.password &&
            String(u.password) === String(password) &&
            ((u.email && emailCandidates.map(e => e.toLowerCase()).includes(u.email.toLowerCase())) ||
             (u.displayName && emailCandidates.map(e => e.toLowerCase()).includes(u.displayName.toLowerCase().trim())) ||
             (u.email && emailCandidates.map(e => e.toLowerCase()).includes(u.email.toLowerCase().split('@')[0])))
        );
        if (localUserMeta) {
          matchedUser = {
            uid: localUserMeta.id || localUserMeta.uid,
            email: localUserMeta.email || `${localUserMeta.id || 'usr'}@segurtecpro.com`,
            displayName: localUserMeta.displayName || "Usuário",
          };
        }
      } catch (err) {
        console.warn("Local users metadata credentials check error:", err);
      }
    }

    // Check Cloud Firestore users collection
    if (!matchedUser && isFirebaseInitialized) {
      try {
        const usersRef = admin.firestore().collection("users");
        for (const candEmail of emailCandidates) {
          const snapshot = await usersRef.where("email", "==", candEmail.toLowerCase()).get();
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            const userData = docSnap.data();
            if (String(userData?.password || '') === String(password)) {
              matchedUser = {
                uid: docSnap.id,
                email: userData.email || candEmail,
                displayName: userData.displayName || "Usuário Master",
              };
              break;
            }
          }
        }
      } catch (err: any) {
        console.warn("Firestore fallback check query bypassed:", err.message || err);
      }
    }

    if (matchedUser) {
      let customToken = null;
      if (isFirebaseInitialized) {
        try {
          customToken = await admin.auth().createCustomToken(matchedUser.uid);
        } catch (tokenErr: any) {
          console.error("Failed to generate custom token in fallback login:", tokenErr.message || tokenErr);
        }
      }
      return res.json({
        success: true,
        customToken,
        user: matchedUser
      });
    } else {
      return res.status(401).json({ error: "Credenciais inválidas. Verifique usuário e senha e tente novamente." });
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

  app.get("/api/localdb/:collection", (req, res) => {
    const { collection } = req.params;
    const filePath = getSafeFileName(collection);
    const data = readJSONFile(filePath);
    res.json(data);
  });

  app.get("/api/localdb/:collection/:id", (req, res) => {
    const { collection, id } = req.params;
    const filePath = getSafeFileName(collection);
    const data = readJSONFile(filePath);
    const found = data.find((item) => item.id === id);
    if (!found) {
      return res.status(404).json({ error: "Documento não encontrado na database local" });
    }
    res.json(found);
  });

  app.post("/api/localdb/:collection", (req, res) => {
    const { collection } = req.params;
    const filePath = getSafeFileName(collection);
    const data = readJSONFile(filePath);

    const item = req.body;
    data.push(item);
    writeJSONFile(filePath, data);
    res.json(item);
  });

  app.put("/api/localdb/:collection/:id", (req, res) => {
    const { collection, id } = req.params;
    const filePath = getSafeFileName(collection);
    let data = readJSONFile(filePath);

    const itemIndex = data.findIndex((item) => item.id === id);
    const updatedItem = req.body;

    if (itemIndex >= 0) {
      data[itemIndex] = updatedItem;
    } else {
      data.push(updatedItem);
    }

    writeJSONFile(filePath, data);
    res.json(updatedItem);
  });

  app.patch("/api/localdb/:collection/:id", (req, res) => {
    const { collection, id } = req.params;
    const filePath = getSafeFileName(collection);
    let data = readJSONFile(filePath);

    const itemIndex = data.findIndex((item) => item.id === id);
    if (itemIndex < 0) {
      return res.status(404).json({ error: "Documento não encontrado para modificação" });
    }

    data[itemIndex] = { ...data[itemIndex], ...req.body };
    writeJSONFile(filePath, data);
    res.json(data[itemIndex]);
  });

  app.delete("/api/localdb/:collection/:id", (req, res) => {
    const { collection, id } = req.params;
    const filePath = getSafeFileName(collection);
    const data = readJSONFile(filePath);

    const filtered = data.filter((item) => item.id !== id);
    writeJSONFile(filePath, filtered);
    res.json({ success: true });
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
    if (isFirebaseInitialized) {
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
        console.warn("Firestore password backup check bypassed (Firestore API disabled or unconfigured on GCP):", fsErr.message || fsErr);
      }
    }
    res.json({ success: false, message: "Senha não encontrada no cadastro local ou ambiente em nuvem real." });
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

    if (isLocalDb || !isFirebaseInitialized) {
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
      try {
        const userDocRef = admin.firestore().collection('users').doc(uid);
        const updateObj: any = {};
        if (newPassword) updateObj.password = newPassword;
        if (newEmail) updateObj.email = newEmail.trim().toLowerCase();
        await userDocRef.set(updateObj, { merge: true });
      } catch (fError: any) {
        console.warn("Failed to update password in Firestore doc (non-blocking):", fError.message || fError);
      }

      res.json({ success: true, message: "Cadastro e senha atualizados com sucesso." });
    } catch (error: any) {
      console.warn("Firebase admin auth failed, falling back to local and firestore hybrid updates:", error.message || error);
      
      // Check if this error is specifically due to disabled Identity Toolkit API
      const errMsg = error.message || "";
      const isIdentityToolkitDisabled = 
        errMsg.includes("Identity Toolkit API") || 
        errMsg.includes("identitytoolkit.googleapis.com") || 
        errMsg.includes("PERMISSION_DENIED") ||
        errMsg.includes("accessNotConfigured") ||
        (error.code && error.code.includes("internal-error")) ||
        (error.code && error.code.includes("permission-denied"));

      if (isIdentityToolkitDisabled) {
        // Yes, the Identity Toolkit API is disabled in this GCP environment.
        // Let's run the local disk sync, AND ALSO perform a clean update on the Firestore users collection
        // so that the password and settings are stored persistently in their database.
        updateLocalFlatFile();
        
        let dbSyncSuccess = false;
        try {
          const userDocRef = admin.firestore().collection('users').doc(uid);
          const updateObj: any = {};
          if (newPassword) updateObj.password = newPassword;
          if (newEmail) updateObj.email = newEmail.trim().toLowerCase();
          await userDocRef.set(updateObj, { merge: true });
          dbSyncSuccess = true;
          console.log("Fallback: Credentials updated in Firestore user record successfully.");
        } catch (fsErr: any) {
          console.warn("Fallback: Firestore credentials save bypassed (Firestore API disabled on GCP):", fsErr.message || fsErr);
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

    if (isLocalDb || !isFirebaseInitialized) {
      deleteLocalFlatFile();
      return res.json({ success: true, message: "Usuário excluído com sucesso do login local." });
    }

    try {
      await admin.auth().deleteUser(uid);
      
      // Delete locally as well for double safety
      deleteLocalFlatFile();

      // Try to delete from Firestore users collection
      try {
        await admin.firestore().collection('users').doc(uid).delete();
      } catch (fError: any) {
        console.warn("Failed to delete user doc in Firestore (non-blocking):", fError.message || fError);
      }

      res.json({ success: true, message: "Usuário excluído com sucesso." });
    } catch (error: any) {
      console.warn("Firebase Auth deleteUser failed, falling back to local deletion:", error.message || error);
      
      const errMsg = error.message || "";
      const isIdentityToolkitDisabled = 
        errMsg.includes("Identity Toolkit API") || 
        errMsg.includes("identitytoolkit.googleapis.com") || 
        errMsg.includes("PERMISSION_DENIED") ||
        errMsg.includes("accessNotConfigured") ||
        (error.code && error.code.includes("internal-error")) ||
        (error.code && error.code.includes("permission-denied"));

      if (isIdentityToolkitDisabled) {
        deleteLocalFlatFile();
        
        // Also try to delete from Firestore doc just in case
        try {
          await admin.firestore().collection('users').doc(uid).delete();
        } catch (fsErr: any) {
          console.warn("Fallback delete from Firestore doc bypassed (Firestore API disabled on GCP):", fsErr.message || fsErr);
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
