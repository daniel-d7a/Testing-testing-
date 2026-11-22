import express from "express";
import session from "express-session";
import { createAuthRouter } from "./auth/auth.router";
import { errorHandler } from "./middleware/error-handler";
import type { UserService } from "./users/user.service";

export interface AppDeps {
  userService: UserService;
  sessionSecret: string;
  sessionStore?: session.Store; // inject a real store in prod (e.g. connect-pg-simple)
  secureCookies?: boolean; // true in production (HTTPS only)
}

export function createApp(deps: AppDeps) {
  const app = express();
  if (deps.secureCookies) app.set("trust proxy", 1); // behind a TLS-terminating proxy

  app.use(express.json());
  app.use(
    session({
      name: "sid",
      secret: deps.sessionSecret,
      store: deps.sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: deps.secureCookies ?? false, // secure cookies are dropped over plain HTTP (Supertest!)
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );

  app.use(createAuthRouter(deps.userService));
  app.use(errorHandler); // must be last
  return app;
}
