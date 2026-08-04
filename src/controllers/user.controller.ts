// user.controller.ts — HTTP layer only: read req (params/query/body), call
// the matching service, shape the res (status code + JSON). No business
// logic and no direct Prisma/DB access here — that belongs in the service
// and repository layers.
//
// TODO:
// - export const listUsers = asyncHandler(async (req, res) => {...});
// - export const getUser = asyncHandler(async (req, res) => {...});
// - export const createUser = asyncHandler(async (req, res) => {...});
// - export const updateUser = asyncHandler(async (req, res) => {...});
// - export const deleteUser = asyncHandler(async (req, res) => {...});
