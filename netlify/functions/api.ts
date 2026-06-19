import serverless from "serverless-http";
import { app, initializeBotFromFirestore } from "../../server";

// We catch all API routes for 404s, because in server.ts the catch-all
// might not be registered in Netlify mode correctly at the very end
app.all("/api/*", (req, res) => {
  if (!res.headersSent) {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  }
});

let isInitialized = false;

const handlerApp = serverless(app, {
  request: (req: any, event: any, context: any) => {
    // If we're routed through /.netlify/functions/api, rewrite path so Express matches /api/*
    const rawPath = event.path || "";
    if (rawPath.startsWith("/.netlify/functions/api")) {
      req.url = rawPath.replace("/.netlify/functions/api", "/api");
    }
  }
});

export const handler = async (event: any, context: any) => {
  if (!isInitialized) {
    await initializeBotFromFirestore();
    isInitialized = true;
  }
  return handlerApp(event, context);
};
