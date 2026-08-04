// Verifies the auth token on protected routes and attaches the resolved
// user to req.user (see types/express.d.ts). Use as route-level middleware,
// e.g. router.get("/me", requireAuth, userController.getMe).
//
// TODO:
// - export function requireAuth(req, res, next) {...}
