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

  if (usersChanged) {
    writeJSONFile(usersPath, users);
    console.log("[Local Seeding] Core metadata profiles repaired successfully!");
  }
}

async function startServer() {
  ensureLocalDataSeeded();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    // Ensure database is seeded
    ensureLocalDataSeeded();

    const authUsersPath = getSafeFileName("auth_users");
    const authUsers = readJSONFile(authUsersPath);

    const user = authUsers.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        String(u.password) === String(password)
    );

    if (!user) {
      return res.status(400).json({ error: "E-mail ou senha incorretos." });
    }

    const { password: _, ...cleanUser } = user;
    res.json({
      uid: cleanUser.uid,
      email: cleanUser.email,
      displayName: cleanUser.displayName,
      emailVerified: true,
    });
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
      role: "tecnico",
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

  app.post("/api/admin/update-user-password", async (req, res) => {
    const { uid, newPassword, newEmail } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: "UID is required." });
    }

    // In local mode or fallback, directly modify our flat-file auth dataset
    const isLocalDb = process.env.VITE_LOCAL_DB === 'true';
    if (isLocalDb || !isFirebaseInitialized) {
      const authUsersPath = getSafeFileName("auth_users");
      const authUsers = readJSONFile(authUsersPath);
      const userIndex = authUsers.findIndex(u => u.uid === uid);
      if (userIndex >= 0) {
        if (newPassword) authUsers[userIndex].password = newPassword;
        if (newEmail) authUsers[userIndex].email = newEmail.trim().toLowerCase();
        writeJSONFile(authUsersPath, authUsers);
        return res.json({ success: true, message: "Cadastro login local atualizado com sucesso." });
      } else {
        // If they don't have an auth login credential, let's create one for them!
        const usersPath = getSafeFileName("users");
        const users = readJSONFile(usersPath);
        const userMeta = users.find((u: any) => u.id === uid);
        const emailToUse = newEmail || userMeta?.email || `${uid}@local.com`;
        
        authUsers.push({
          uid,
          email: emailToUse.trim().toLowerCase(),
          password: newPassword || "123456",
          displayName: userMeta?.displayName || "Usuário Local"
        });
        writeJSONFile(authUsersPath, authUsers);
        return res.json({ success: true, message: "Cadastro login local criado e atualizado com sucesso." });
      }
    }

    // Standard Firebase Auth branch (Cloud)
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
      res.json({ success: true, message: "Cadastro atualizado com sucesso no Firebase Auth." });
    } catch (error: any) {
      console.error("Error updating user credentials:", error);
      let errMsg = error.message || "Erro ao atualizar dados do usuário no Auth.";
      if (
        errMsg.includes("Identity Toolkit API") || 
        errMsg.includes("identitytoolkit.googleapis.com") || 
        (error.code && error.code.includes("internal-error"))
      ) {
        errMsg = "Identity Toolkit API is disabled or not activated in project 154805406116. Please enable it at https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=154805406116";
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/admin/delete-user", async (req, res) => {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: "UID is required." });
    }

    const isLocalDb = process.env.VITE_LOCAL_DB === 'true';
    if (isLocalDb || !isFirebaseInitialized) {
      const authUsersPath = getSafeFileName("auth_users");
      const authUsers = readJSONFile(authUsersPath);
      const filtered = authUsers.filter(u => u.uid !== uid);
      writeJSONFile(authUsersPath, filtered);
      return res.json({ success: true, message: "Usuário excluído com sucesso do login local." });
    }

    try {
      await admin.auth().deleteUser(uid);
      res.json({ success: true, message: "Usuário excluído com sucesso do Auth." });
    } catch (error: any) {
      console.error("Error deleting user from auth:", error);
      let errMsg = error.message || "Erro ao excluir usuário do Auth.";
      if (
        errMsg.includes("Identity Toolkit API") || 
        errMsg.includes("identitytoolkit.googleapis.com") || 
        (error.code && error.code.includes("internal-error"))
      ) {
        errMsg = "Identity Toolkit API is disabled or not activated in project 154805406116. Please enable it at https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=154805406116";
      }
      res.status(500).json({ error: errMsg });
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
