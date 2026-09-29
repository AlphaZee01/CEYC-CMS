import serverless from "serverless-http";
import { app, bootstrapDatabase } from "../server/index.js";

export const config = {
  maxDuration: 60,
};

let handler;
let bootstrapPromise = null;

function startBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapDatabase();
  }
  return bootstrapPromise;
}

export default async function vercelHandler(req, res) {
  startBootstrap();
  if (!handler) {
    handler = serverless(app);
  }
  return handler(req, res);
}
