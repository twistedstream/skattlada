import { Request, Response } from "express";

export function redirectBack(req: Request, res: Response) {
  const referrer = req.get("Referrer") || "/";
  res.redirect(referrer);
}
