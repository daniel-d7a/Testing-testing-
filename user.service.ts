import bcrypt from "bcryptjs";
import type { UserRepo } from "./user.repo";

export class EmailTakenError extends Error {}
export class InvalidCredentialsError extends Error {}

export interface Hasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export const createBcryptHasher = (cost = 10): Hasher => ({
  hash: (plain) => bcrypt.hash(plain, cost),
  verify: (plain, hash) => bcrypt.compare(plain, hash),
});

export class UserService {
  constructor(private repo: UserRepo, private hasher: Hasher) {}

  async register(email: string, password: string) {
    if (await this.repo.findByEmail(email)) throw new EmailTakenError();
    return this.repo.create({ email, passwordHash: await this.hasher.hash(password) });
  }

  async login(email: string, password: string) {
    const user = await this.repo.findByEmail(email);
    // Same error for "no such user" and "wrong password": don't leak which emails exist
    if (!user || !(await this.hasher.verify(password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }
    return user;
  }

  getById(id: number) {
    return this.repo.findById(id);
  }
}
