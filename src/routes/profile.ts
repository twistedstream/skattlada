import { urlencoded } from "body-parser";
import { Response, Router } from "express";

import {
  fetchCredentialsByUserId,
  modifyUser,
  removeUserCredential,
} from "../services/user";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
} from "../types/express";
import { requiresAuth } from "../utils/auth";
import { generateCsrfToken, validateCsrfToken } from "../utils/csrf";
import { BadRequestError, assertValue } from "../utils/error";

const router = Router();

// endpoints

router.get(
  "/",
  requiresAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = assertValue(req.user);
    const credential = assertValue(req.credential);

    const credentials = await fetchCredentialsByUserId(user.id);
    const passkeys = [...credentials].map((c) => ({
      id: c.credentialID,
      type: c.credentialDeviceType,
      created: c.created.toISO(),
    }));

    const viewProfile = {
      ...req.user,
      activePasskey: passkeys.find((p) => p.id === credential.credentialID),
      otherPasskeys: passkeys.filter((p) => p.id !== credential.credentialID),
    };

    const csrf_token = generateCsrfToken(req, res);
    res.render("profile", {
      csrf_token,
      title: "Profile",
      profile: viewProfile,
    });
  }
);

router.post(
  "/",
  urlencoded({ extended: false }),
  validateCsrfToken(),
  requiresAuth(),
  async (
    req: AuthenticatedRequestWithTypedBody<{
      action: "update_profile" | "delete_cred";
      display_name?: string;
      cred_id?: string;
    }>,
    res: Response
  ) => {
    const user = assertValue(req.user);
    const credential = assertValue(req.credential);

    const { action, display_name } = req.body;
    if (action === "update_profile" && display_name) {
      // update user profile
      user.displayName = display_name;
      try {
        await modifyUser(user);
      } catch (err: any) {
        if (err.type === "validation") {
          throw BadRequestError(err.message);
        }

        throw err;
      }

      return res.redirect("back");
    }

    const { cred_id } = req.body;
    if (action === "delete_cred" && cred_id) {
      if (credential.credentialID === cred_id) {
        throw BadRequestError(
          "Cannot delete credential that was used to sign into the current session"
        );
      }

      await removeUserCredential(user.id, cred_id);

      return res.redirect("back");
    }

    throw BadRequestError("Unsupported profile action");
  }
);

export default router;
