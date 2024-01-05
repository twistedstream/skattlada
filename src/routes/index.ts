import { Request, Response, Router } from "express";
import { RequestWithTypedQuery } from "../types/express";
import { capturePreAuthState, getRegisterable, signOut } from "../utils/auth";
import { ForbiddenError } from "../utils/error";
import fido2 from "./fido2";
import invites from "./invites";
import profile from "./profile";
import shares from "./shares";

const router = Router();

// endpoints

router.get("/", (_req: Request, res: Response) => {
  res.redirect("/shares");
});

router.get(
  "/register",
  (
    req: RequestWithTypedQuery<{ return_to: string; hide_sign_in: string }>,
    res: Response
  ) => {
    capturePreAuthState(req);

    if (!getRegisterable(req)) {
      throw ForbiddenError("Registration not allowed without an invitation");
    }

    res.render("register", {
      title: "Sign up",
      return_to: req.query.return_to,
      show_sign_in: !req.query.hide_sign_in,
    });
  }
);

router.get(
  "/login",
  (req: RequestWithTypedQuery<{ return_to: string }>, res: Response) => {
    capturePreAuthState(req);

    res.render("login", {
      title: "Sign in",
      return_to: req.query.return_to,
    });
  }
);

router.get("/logout", (req: Request, res: Response) => {
  signOut(req);

  res.redirect("/");
});

// child routes

router.use("/fido2", fido2);
router.use("/profile", profile);
router.use("/invites", invites);
router.use("/shares", shares);

export default router;
