import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CREDS, buildTestApp, loginAs } from "../helpers/test-app";
import { createTestDb } from "../helpers/test-db";

describe("auth (cookie sessions)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let app: ReturnType<typeof buildTestApp>["app"];
  let service: ReturnType<typeof buildTestApp>["service"];

  beforeAll(async () => {
    t = await createTestDb();
  });
  afterAll(() => t.close());

  beforeEach(async () => {
    await t.reset();
    ({ app, service } = buildTestApp(t.db)); // new app + new session store per test
  });

  describe("POST /auth/register", () => {
    it("201 and never returns the password hash", async () => {
      const res = await request(app).post("/auth/register").send(CREDS);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 1, email: CREDS.email });
    });

    it("400 with field errors for an invalid body", async () => {
      const res = await request(app).post("/auth/register").send({ email: "nope", password: "short" });
      expect(res.status).toBe(400);
      expect(res.body.error.map((e: { field: string }) => e.field)).toEqual(
        expect.arrayContaining(["email", "password"]),
      );
    });

    it("409 when the email is already registered", async () => {
      await service.register(CREDS.email, CREDS.password);
      await request(app).post("/auth/register").send(CREDS).expect(409);
    });

    it("treats emails case-insensitively", async () => {
      await service.register(CREDS.email, CREDS.password);
      await request(app)
        .post("/auth/register")
        .send({ ...CREDS, email: CREDS.email.toUpperCase() })
        .expect(409);
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(() => service.register(CREDS.email, CREDS.password));

    it("200 and sets a hardened session cookie", async () => {
      const res = await request(app).post("/auth/login").send(CREDS);
      expect(res.status).toBe(200);

      const cookie = res.headers["set-cookie"]?.[0] ?? "";
      expect(cookie).toMatch(/^sid=/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    });

    it("401 for a wrong password, with no cookie", async () => {
      const res = await request(app).post("/auth/login").send({ ...CREDS, password: "wrongpass1" });
      expect(res.status).toBe(401);
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("401 for an unknown email (same response as wrong password)", async () => {
      const res = await request(app).post("/auth/login").send({ ...CREDS, email: "ghost@test.com" });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid credentials" });
    });
  });

  describe("protected routes", () => {
    beforeEach(() => service.register(CREDS.email, CREDS.password));

    it("GET /me is 401 without a session", async () => {
      await request(app).get("/me").expect(401);
    });

    it("GET /me returns the user when logged in (agent keeps the cookie)", async () => {
      const agent = await loginAs(app);
      const res = await agent.get("/me");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, email: CREDS.email });
    });

    it("a forged cookie is rejected", async () => {
      await request(app).get("/me").set("Cookie", ["sid=s%3Aforged.signature"]).expect(401);
    });

    it("sessions are isolated: one agent's login does not log in another", async () => {
      await loginAs(app);
      await request.agent(app).get("/me").expect(401);
    });

    it("POST /auth/logout destroys the session", async () => {
      const agent = await loginAs(app);
      await agent.post("/auth/logout").expect(204);
      await agent.get("/me").expect(401);
    });

    it("login issues a new session id (no session fixation)", async () => {
      const first = await request(app).post("/auth/login").send(CREDS);
      const second = await request(app).post("/auth/login").send(CREDS);
      expect(first.headers["set-cookie"][0]).not.toEqual(second.headers["set-cookie"][0]);
    });
  });
});
