import { describe, expect, it } from "vitest";
import type { User } from "../../src/db/schema";
import type { UserRepo } from "../../src/users/user.repo";
import {
  EmailTakenError,
  InvalidCredentialsError,
  UserService,
  type Hasher,
} from "../../src/users/user.service";

// Fakes: tiny working implementations, no mocking library needed
class FakeRepo implements UserRepo {
  users: User[] = [];
  async findByEmail(email: string) {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async findById(id: number) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async create(data: { email: string; passwordHash: string }) {
    const user = { id: this.users.length + 1, createdAt: new Date(), ...data };
    this.users.push(user);
    return user;
  }
}

const fakeHasher: Hasher = {
  hash: async (p) => `hashed:${p}`,
  verify: async (p, h) => h === `hashed:${p}`,
};

describe("UserService", () => {
  const setup = () => {
    const repo = new FakeRepo();
    return { repo, service: new UserService(repo, fakeHasher) };
  };

  it("register stores a hashed password, never the plain one", async () => {
    const { repo, service } = setup();
    await service.register("a@test.com", "secret123");
    expect(repo.users[0].passwordHash).toBe("hashed:secret123");
  });

  it("register rejects a duplicate email", async () => {
    const { service } = setup();
    await service.register("a@test.com", "secret123");
    await expect(service.register("a@test.com", "other")).rejects.toThrow(EmailTakenError);
  });

  it("login returns the user for correct credentials", async () => {
    const { service } = setup();
    await service.register("a@test.com", "secret123");
    const user = await service.login("a@test.com", "secret123");
    expect(user.email).toBe("a@test.com");
  });

  it.each([
    ["wrong password", "a@test.com", "nope"],
    ["unknown email", "ghost@test.com", "secret123"],
  ])("login fails with the same error for %s", async (_name, email, password) => {
    const { service } = setup();
    await service.register("a@test.com", "secret123");
    await expect(service.login(email, password)).rejects.toThrow(InvalidCredentialsError);
  });
});
