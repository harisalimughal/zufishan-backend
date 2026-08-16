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
import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { userController } from '../controllers/user.controller'
import { validate } from '../middlewares/validate.middleware'
import { updateProfileSchema, updatePreferencesSchema, changePasswordSchema } from '../validators/user.validator'

const router = Router()

router.use(authenticate)

router.get('/profile', userController.getProfile)
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile)
router.put('/profile', validate(updateProfileSchema), userController.updateProfile)
router.patch('/preferences', validate(updatePreferencesSchema), userController.updatePreferences)
router.put('/preferences', validate(updatePreferencesSchema), userController.updatePreferences)
router.put('/password', validate(changePasswordSchema), userController.changePassword)

export default router