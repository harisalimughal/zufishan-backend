// Loads and validates process.env, exports a typed `env` object so the rest
// of the app never touches `process.env` directly.
//
// TODO:
// - dotenv.config()
// - validate required vars (DATABASE_URL, JWT_SECRET, ...) and fail fast if missing
// - export a typed `env` object (PORT, NODE_ENV, DATABASE_URL, JWT_SECRET, ...)
