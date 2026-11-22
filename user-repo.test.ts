import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DrizzleUserRepo } from "../../src/users/user.repo";
import { createTestDb } from "../helpers/test-db";

describe("DrizzleUserRepo (real Postgres via PGlite)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let repo: DrizzleUserRepo;

  beforeAll(async () => {
    t = await createTestDb(); // once per file
    repo = new DrizzleUserRepo(t.db);
  });
  afterAll(() => t.close());
  beforeEach(() => t.reset()); // clean tables per test

  it("creates and finds a user by email and id", async () => {
    const created = await repo.create({ email: "a@test.com", passwordHash: "x" });
    expect(created.id).toBe(1);
    expect(await repo.findByEmail("a@test.com")).toMatchObject({ id: 1 });
    expect(await repo.findById(1)).toMatchObject({ email: "a@test.com" });
  });

  it("returns null when nothing matches", async () => {
    expect(await repo.findByEmail("ghost@test.com")).toBeNull();
    expect(await repo.findById(999)).toBeNull();
  });

  it("enforces the unique email constraint in the database", async () => {
    await repo.create({ email: "a@test.com", passwordHash: "x" });
    await expect(repo.create({ email: "a@test.com", passwordHash: "y" })).rejects.toThrow();
  });
});
