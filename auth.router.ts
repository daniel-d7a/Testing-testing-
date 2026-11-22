import { Router, type Request } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import {
  EmailTakenError,
  InvalidCredentialsError,
  type UserService,
} from "../users/user.service";

const credentials = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(100),
});

const formatIssues = (error: z.ZodError) =>
  error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));

// express-session uses callbacks; wrap them so we can await
const regenerate = (req: Request) =>
  new Promise<void>((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
const save = (req: Request) =>
  new Promise<void>((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));
const destroy = (req: Request) =>
  new Promise<void>((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())));

export function createAuthRouter(service: UserService) {
  const router = Router();

  router.post("/auth/register", async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: formatIssues(parsed.error) });

    try {
      const user = await service.register(parsed.data.email, parsed.data.password);
      res.status(201).json({ id: user.id, email: user.email }); // never return passwordHash
    } catch (e) {
      if (e instanceof EmailTakenError) return res.status(409).json({ error: "Email already registered" });
      throw e; // Express 5 forwards rejected promises to the error handler
    }
  });

  router.post("/auth/login", async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: formatIssues(parsed.error) });

    try {
      const user = await service.login(parsed.data.email, parsed.data.password);
      await regenerate(req); // new session id on login (prevents session fixation)
      req.session.userId = user.id;
      await save(req);
      res.json({ id: user.id, email: user.email });
    } catch (e) {
      if (e instanceof InvalidCredentialsError) return res.status(401).json({ error: "Invalid credentials" });
      throw e;
    }
  });

  router.post("/auth/logout", requireAuth, async (req, res) => {
    await destroy(req);
    res.clearCookie("sid");
    res.status(204).end();
  });

  router.get("/me", requireAuth, async (req, res) => {
    const user = await service.getById(req.session.userId!);
    if (!user) return res.status(401).json({ error: "Unauthorized" }); // user deleted after login
    res.json({ id: user.id, email: user.email });
  });

  return router;
}
