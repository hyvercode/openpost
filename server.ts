import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Initialize Firebase App & Firestore for the mock server
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  app.post("/api/generate-code", async (req, res) => {
    try {
      const { requestConfig, language } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Generate client-side request code using ${language} for the following HTTP request config:
      \n\n${JSON.stringify(requestConfig, null, 2)}
      \n\nReturn ONLY the raw code string, no markdown formatting or backticks.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });
      
      res.json({ code: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Proxy Endpoint
  app.post("/api/proxy", async (req, res) => {
    try {
      const { method, url, headers, body, params } = req.body;
      
      const startTime = Date.now();
      const response = await axios({
        method: method || "GET",
        url,
        headers: headers || {},
        data: body,
        params: params || {},
        validateStatus: () => true, // Resolve all status codes
      });
      const endTime = Date.now();

      res.json({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        timeMs: endTime - startTime,
        size: JSON.stringify(response.data).length, // Rough estimation
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
        details: error.response?.data || "Network Error or CORS failure in proxy",
      });
    }
  });

  // Dynamic Mock Server Endpoints
  app.all("/mock/:deployId*", async (req, res) => {
    const deployId = (req.params as any).deployId || (req.params as any)["deployId*"];
    if (!deployId) {
      return res.status(400).json({ error: "Missing deployId in path" });
    }

    // Capture the subpath
    const fullPath = req.path; // e.g. "/mock/abc123v1/users" or "/mock/abc123v1"
    let subpath = fullPath.replace(new RegExp(`^/mock/${deployId}`), "");
    if (!subpath.startsWith("/")) {
      subpath = "/" + subpath;
    }
    // Remove trailing slash for consistency
    if (subpath.length > 1 && subpath.endsWith("/")) {
      subpath = subpath.slice(0, -1);
    }

    try {
      // Fetch deployment from Firestore
      const docRef = doc(db, "deployments", deployId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).json({ error: `Mock Deployment with ID "${deployId}" not found` });
      }

      const deployment = docSnap.data();
      const requests = deployment.requests || [];

      // Clean up helper to extract path
      const getPathFromUrl = (urlStr: string) => {
        try {
          if (!urlStr) return "/";
          // Replace environment variable placeholders like {{baseUrl}} with empty string
          let cleaned = urlStr.replace(/\{\{[^}]+\}\}/g, "");
          if (!cleaned.startsWith("http") && !cleaned.startsWith("/")) {
            cleaned = "/" + cleaned;
          }
          const u = new URL(cleaned, "http://dummy.com");
          let p = u.pathname;
          if (p.length > 1 && p.endsWith("/")) {
            p = p.slice(0, -1);
          }
          return p;
        } catch (e) {
          return urlStr || "/";
        }
      };

      const matchingRequest = requests.find((r: any) => {
        const sameMethod = r.method.toUpperCase() === req.method.toUpperCase();
        const rPath = getPathFromUrl(r.url);
        return sameMethod && rPath === subpath;
      });

      if (!matchingRequest) {
        return res.status(404).json({
          error: `No mock route found for [${req.method}] "${subpath}"`,
          deployment: {
            id: deployId,
            collectionName: deployment.collectionName,
            version: deployment.version
          },
          availableRoutes: requests.map((r: any) => `[${r.method}] ${getPathFromUrl(r.url)}`)
        });
      }

      // Return the mock response
      const mockRes = matchingRequest.mockResponse || {
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        body: JSON.stringify({ message: `Mock response for ${matchingRequest.name}` })
      };

      // Set headers
      if (mockRes.headers && Array.isArray(mockRes.headers)) {
        mockRes.headers.forEach((h: any) => {
          if (h.enabled && h.key && h.value) {
            res.setHeader(h.key, h.value);
          }
        });
      } else {
        res.setHeader("Content-Type", "application/json");
      }

      res.status(Number(mockRes.status) || 200);

      // Try JSON, fallback to raw text
      try {
        const parsedBody = JSON.parse(mockRes.body);
        res.json(parsedBody);
      } catch (e) {
        res.send(mockRes.body);
      }
    } catch (err: any) {
      console.error("Mock API Router Error:", err);
      res.status(500).json({ error: "Internal Mock Server Error", details: err.message });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
