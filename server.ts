import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";

// Initialize Firebase Admin
// No need for a service account key inside the container as it uses ADC (Application Default Credentials)
// as long as the project ID is specified.
admin.initializeApp({
  projectId: "seguranca-tecnica-app"
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to update user password
  app.post("/api/admin/update-user-password", async (req, res) => {
    const { uid, newPassword } = req.body;
    
    if (!uid || !newPassword) {
      return res.status(400).json({ error: "UID and newPassword are required." });
    }

    try {
      await admin.auth().updateUser(uid, {
        password: newPassword
      });
      res.json({ success: true, message: "Senha atualizada com sucesso pelo administrador." });
    } catch (error: any) {
      console.error("Error updating user password:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar senha." });
    }
  });

  // API to delete user from Auth
  app.post("/api/admin/delete-user", async (req, res) => {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: "UID is required." });
    }

    try {
      await admin.auth().deleteUser(uid);
      res.json({ success: true, message: "Usuário excluído com sucesso do Auth." });
    } catch (error: any) {
      console.error("Error deleting user from auth:", error);
      res.status(500).json({ error: error.message || "Erro ao excluir usuário do Auth." });
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
