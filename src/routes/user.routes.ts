// user.routes.ts — maps HTTP verb + path to a controller method for the
// "user" module. Routes stay dumb: no logic, just wiring
// (path -> [middleware...] -> controller).
//
// Pattern for a new module "<name>": create <name>.routes.ts here, then
// register it in routes/index.ts.
//
// TODO:
// - import { Router } from "express";
// - import * as userController from "../controllers/user.controller";
// - router.get("/", userController.listUsers);
// - router.get("/:id", userController.getUser);
// - router.post("/", userController.createUser);
// - router.patch("/:id", userController.updateUser);
// - router.delete("/:id", userController.deleteUser);
