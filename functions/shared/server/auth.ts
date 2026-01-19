import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { User as DbUser } from "../schema";
import { storage } from "./storage";

type AuthUser = Omit<DbUser, "pin">;

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export function setupAuth(app: Express) {
  const isProd = process.env.NODE_ENV === "production";
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r3pl1t_s3cr3t_k3y",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      // Secure/SameSite need to loosen in local dev (http) so the cookie sticks
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        passwordField: "pin", // accept PIN field instead of default "password"
      },
      async (username, pin, done) => {
        let user = await storage.getUserByUsername(username);

        // Auto-create default accounts if they are missing but correct PIN is provided
        const defaultUsers = [
          { username: "admin", pin: "1111", role: "admin", name: "Admin User" },
          { username: "staff", pin: "2222", role: "staff", name: "Staff User" },
          { username: "account", pin: "3333", role: "accounting", name: "Accounting User" },
          { username: "aaaaa", pin: "1111", role: "staff", name: "User AAAAA" },
        ];

        if (!user) {
          const match = defaultUsers.find((u) => u.username === username && u.pin === pin);
          if (match) {
            user = await storage.createUser(match);
          }
        }

        if (!user || user.pin !== pin) {
          return done(null, false);
        }
        return done(null, user);
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id as number);
    done(null, user);
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
