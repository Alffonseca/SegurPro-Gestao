import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Middleware to validate admin token
async function validateAdminToken(req: Request, res: Response, next: any) {
  const token = req.headers.authorization?.split("Bearer ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(403).json({ error: "User document not found." });
    }

    const userData = userDoc.data();
    const isAdmin = userData?.role === "admin" || userData?.role === "owner" || userData?.email === "emailparasiteslixo@gmail.com" || userData?.email === "alffonseca42@gmail.com";
    
    if (!isAdmin) {
      return res.status(403).json({ error: "Insufficient permissions. Admin access required." });
    }

    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Invalid token." });
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // API to update user password
  app.post("/api/admin/update-user-password", validateAdminToken, async (req: Request, res: Response) => {
    const { uid, newPassword } = req.body;
    
    if (!uid || !newPassword) {
      return res.status(400).json({ error: "UID and newPassword are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
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
  app.post("/api/admin/delete-user", validateAdminToken, async (req: Request, res: Response) => {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: "UID is required." });
    }

    try {
      // Delete from Firestore first
      await admin.firestore().collection("users").doc(uid).delete();
      // Then delete from Auth
      await admin.auth().deleteUser(uid);
      res.json({ success: true, message: "Usuário excluído com sucesso do Auth." });
    } catch (error: any) {
      console.error("Error deleting user from auth:", error);
      res.status(500).json({ error: error.message || "Erro ao excluir usuário do Auth." });
    }
  });

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
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
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
