import { Router } from "express";

import { MarketplaceAuthController } from "../controllers/marketplace-auth.controller";

import { validate } from "../middlewares/validate.middleware";

import {
  registerSchema,
  loginSchema,
  marketplaceRefreshTokenSchema,
} from "../validators/marketplace-auth.validator";

const router = Router();

const controller = new MarketplaceAuthController();

/*
 * Register a marketplace user.
 *
 * POST /api/marketplace/register
 */
router.post(
  "/register",
  validate(registerSchema),
  controller.register
);

/*
 * Login a marketplace user.
 *
 * POST /api/marketplace/login
 */
router.post(
  "/login",
  validate(loginSchema),
  controller.login
);

router.post(
  "/refresh",
  validate(marketplaceRefreshTokenSchema),
  controller.refreshToken
);

export default router;
