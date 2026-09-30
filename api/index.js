import serverless from "serverless-http";
import { handleLightPublic, matchLightPublicPath } from "./light-public.js";
import { handleLightAuthMe, matchLightAuthMePath } from "./light-auth-me.js";
import { handleLightBootstrap, matchLightBootstrapPath } from "./light-bootstrap.js";

export const config = {
  maxDuration: 60,
};

let handler;
let bootstrapPromise = null;
let appModule;

async function loadApp() {
  if (!appModule) {
    appModule = await import("../server/index.js");
  }
  return appModule;
}

function startBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = loadApp().then((m) => m.bootstrapDatabase());
  }
  return bootstrapPromise;
}

export default async function vercelHandler(req, res) {
  const kind = matchLightPublicPath(req.url);
  if (kind && handleLightPublic(kind, req, res)) {
    void startBootstrap();
    return;
  }

  if (matchLightAuthMePath(req)) {
    void startBootstrap();
    await handleLightAuthMe(req, res);
    return;
  }

  if (matchLightBootstrapPath(req)) {
    void startBootstrap();
    await handleLightBootstrap(req, res);
    return;
  }

  const { app, bootstrapDatabase } = await loadApp();
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapDatabase();
  }
  if (!handler) {
    handler = serverless(app);
  }
  return handler(req, res);
}
