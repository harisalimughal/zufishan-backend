// user.validator.ts — request payload schemas for the "user" module
// (recommended: zod). Used as middleware on the route so controllers only
// ever see already-validated req.body/query/params.
//
// TODO:
// - import { z } from "zod";
// - export const createUserSchema = z.object({ body: z.object({...}) });
// - export const updateUserSchema = z.object({...});
