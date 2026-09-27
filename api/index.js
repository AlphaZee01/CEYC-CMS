import serverless from "serverless-http";
import { app, bootstrapDatabase } from "../server/index.js";

let ready = false;
let handler;

export default async function vercelHandler(req, res) {
  if (!ready) {
    await bootstrapDatabase();
    ready = true;
  }
  if (!handler) {
    handler = serverless(app);
  }
  return handler(req, res);
}
