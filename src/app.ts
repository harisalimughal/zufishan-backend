// Express app assembly — middleware registration + route mounting.
// No `listen()` here; that belongs in server.ts so the app instance can be
// imported directly in tests (supertest) without opening a real port.
//
// TODO:
// - create express() instance
// - register global middleware: helmet, cors, express.json(), morgan, cookie-parser
// - mount routes from "./routes" under /api
// - register notFound + errorHandler middleware last
// - export the app instance
