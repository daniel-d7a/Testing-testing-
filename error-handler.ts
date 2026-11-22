import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (process.env.NODE_ENV !== "test") console.error(err);
  res.status(500).json({ error: "Internal server error" }); // never leak err.message
};
