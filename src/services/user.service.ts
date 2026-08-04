// user.service.ts — business logic for the "user" module: validation rules,
// orchestration across multiple repositories, decisions (e.g. "can this
// user be deleted?"). Called by controllers, calls repositories. Should be
// framework-agnostic — no `req`/`res` here.
//
// TODO:
// - export async function listUsers() {...}
// - export async function getUserById(id: string) {...}
// - export async function createUser(input: ...) {...}
// - export async function updateUser(id: string, input: ...) {...}
// - export async function deleteUser(id: string) {...}
