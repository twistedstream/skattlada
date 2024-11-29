import { urlencoded } from "body-parser";
import { Response, Router } from "express";

import { modifyUser, removeUserCredential } from "../../services/user";
import {
  AuthenticatedRequest,
  AuthenticatedRequestWithTypedBody,
} from "../../types/express";
import { requiresAuth } from "../../utils/auth";
import { generateCsrfToken, validateCsrfToken } from "../../utils/csrf";
import { BadRequestError, assertValue } from "../../utils/error";
import { buildViewData } from "./view";

const router = Router();

// endpoints

router.get(
  "/",
  requiresAuth(),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = assertValue(req.user);
    const credential = assertValue(req.credential);
    const csrfToken = generateCsrfToken(req, res);
    const viewData = await buildViewData(user, credential, csrfToken);

    res.render("profile", {
      ...viewData,
      title: "Profile",
    });
  },
);

router.post(
  "/",
  urlencoded({ extended: false }),
  validateCsrfToken(),
  requiresAuth(),
  async (
    req: AuthenticatedRequestWithTypedBody<{
      action: "update_profile" | "delete_cred";
      display_name: string;
      cred_id?: string;
    }>,
    res: Response,
  ) => {
    const user = assertValue(req.user);
    const credential = assertValue(req.credential);

    const { action, display_name } = req.body;
    if (action === "update_profile") {
      // update user profile
      user.displayName = display_name;
      try {
        await modifyUser(user);
      } catch (err: any) {
        if (err.type === "validation") {
          if (err.context === "User.displayName") {
            const csrfToken = generateCsrfToken(req, res);
            const viewData = await buildViewData(user, credential, csrfToken);
            viewData.display_name_error = err.message;
            return res.render("profile", {
              ...viewData,
              title: "Profile error",
            });
          }

          throw BadRequestError(err.message, err.context);
        }

        throw err;
      }

      return res.redirect("back");
    }

    const { cred_id } = req.body;
    if (action === "delete_cred" && cred_id) {
      if (credential.credentialID === cred_id) {
        throw BadRequestError(
          "Cannot delete credential that was used to sign into the current session",
        );
      }

      await removeUserCredential(user.id, cred_id);

      return res.redirect("back");
    }

    throw BadRequestError("Unsupported profile action");
  },
);

export default router;
