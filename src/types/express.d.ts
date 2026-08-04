// Augments Express's Request type so req.user is typed after auth.middleware
// attaches it. Keep this in sync with whatever requireAuth sets.
//
// TODO:
// - declare global { namespace Express { interface Request { user?: {...} } } }
