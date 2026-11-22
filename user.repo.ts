import { eq } from "drizzle-orm";
import { users, type User } from "../db/schema";
import type { Db } from "../db/types";

export interface UserRepo {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  create(data: { email: string; passwordHash: string }): Promise<User>;
}

export class DrizzleUserRepo implements UserRepo {
  constructor(private db: Db) {}

  async findByEmail(email: string) {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  }

  async findById(id: number) {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async create(data: { email: string; passwordHash: string }) {
    const [row] = await this.db.insert(users).values(data).returning();
    return row;
  }
}
