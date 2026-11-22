import { drizzle } from "drizzle-orm/node-postgres";
import { createApp } from "./app";
import * as schema from "./db/schema";
import { DrizzleUserRepo } from "./users/user.repo";
import { UserService, createBcryptHasher } from "./users/user.service";

const db = drizzle(process.env.DATABASE_URL!, { schema });
const userService = new UserService(new DrizzleUserRepo(db), createBcryptHasher());

const app = createApp({
  userService,
  sessionSecret: process.env.SESSION_SECRET!,
  secureCookies: process.env.NODE_ENV === "production",
});

app.listen(3000, () => console.log("http://localhost:3000"));
