import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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
