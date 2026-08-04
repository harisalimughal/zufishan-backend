// Entry point — loads env vars, starts the HTTP server, connects to the DB.
// Keep this file thin: bootstrapping only, no route/middleware definitions
// (those live in app.ts).
//
// TODO:
// - import { app } from "./app";
// - import { env } from "./config/env";
// - app.listen(env.PORT, () => console.log(`API running on :${env.PORT}`));
