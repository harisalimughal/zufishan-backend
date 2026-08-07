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

import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import router from "./routes";
import { errorHandler } from "./middlewares/error.middleware";
import { notFound } from "./middlewares/notFound.middleware";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use(morgan("dev"));

app.use(cookieParser());

app.use("/api", router);

app.use(notFound);

app.use(errorHandler);

export { app };
