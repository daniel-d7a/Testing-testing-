import request from "supertest";
import session from "express-session";
import { createApp } from "../../src/app";
import type { Db } from "../../src/db/types";
import { DrizzleUserRepo } from "../../src/users/user.repo";
import { UserService, createBcryptHasher } from "../../src/users/user.service";

export function buildTestApp(db: Db) {
  const service = new UserService(new DrizzleUserRepo(db), createBcryptHasher(4)); // cost 4 = fast
  const app = createApp({
    userService: service,
    sessionSecret: "test-secret",
    sessionStore: new session.MemoryStore(), // fresh store per app = no session leaks
  });
  return { app, service };
}

export const CREDS = { email: "ada@test.com", password: "password123" };

/** Returns an agent that is already logged in (it holds the cookie). */
export async function loginAs(app: ReturnType<typeof createApp>, creds = CREDS) {
  const agent = request.agent(app);
  await agent.post("/auth/login").send(creds).expect(200);
  return agent;
}
