import {
  VerifiedAuthenticationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { json } from "body-parser";
import { Request, Response, Router } from "express";

import {
  fetchCredentialById,
  fetchCredentialsByUsername,
  fetchUserById,
  fetchUserByName,
} from "../../services/user";
import { RegisteredAuthenticator, User } from "../../types/entity";
import { AuthenticatedRequest } from "../../types/express";
import { beginSignIn, getAuthentication, signIn } from "../../utils/auth";
import { baseUrl, rpID } from "../../utils/config";
import { BadRequestError } from "../../utils/error";
import { logger } from "../../utils/logger";

const router = Router();

// helpers

export function FailedAuthenticationError() {
  return BadRequestError("We couldn't sign you in");
}

// endpoints

router.post(
  "/options",
  json(),
  async (req: AuthenticatedRequest, res: Response) => {
    // validate request
    let { username, userVerification } = req.body;
    username = username ? username.trim() : "";
    userVerification = userVerification || "preferred";

    // fetch existing user
    let existingUser: User | undefined;
    let existingCredentials: RegisteredAuthenticator[] = [];
    if (username.length > 0) {
      existingUser = await fetchUserByName(username);
      if (!existingUser) {
        logger.warn(`No such user with name '${username}'`);
        throw FailedAuthenticationError();
      }
      existingCredentials = await fetchCredentialsByUsername(username);
      if (existingCredentials.length === 0) {
        // NOTE: this shouldn't happen unless there's a data integrity issue
        throw new Error(
          `Existing user ${existingUser.id} is missing credentials.`
        );
      }
    }

    // generate assertion options (challenge)
    const assertionOptions = await generateAuthenticationOptions({
      // Require users to use a previously-registered authenticator
      allowCredentials: existingCredentials.map((authenticator) => ({
        id: isoBase64URL.toBuffer(authenticator.credentialID),
        type: "public-key",
        // Optional
        transports: authenticator.transports,
      })),
      userVerification,
    });
    logger.debug(assertionOptions, "/assertion/options: assertionOptions");

    // build response
    const challengeResponse = {
      ...assertionOptions,
      status: "ok",
      errorMessage: "",
      // add allowed credentials of existing user
      allowCredentials:
        existingCredentials.length > 0
          ? existingCredentials.map((c) => ({
              type: "public-key",
              id: c.credentialID,
              transports: c.transports,
            }))
          : [],
    };
    logger.info(challengeResponse, "Login challenge response");

    // store authentication state in session
    beginSignIn(
      req,
      challengeResponse.challenge,
      existingUser,
      userVerification
    );

    res.json(challengeResponse);
  }
);

router.post("/result", json(), async (req: Request, res: Response) => {
  // validate request
  const { body } = req;
  const { id } = body;
  if (!id) {
    throw BadRequestError("Missing: credential ID");
  }

  // retrieve authentication state from session
  const authentication = getAuthentication(req);
  if (!authentication) {
    throw BadRequestError("No active authentication");
  }
  logger.debug(
    authentication,
    "/assertion/result: Authentication state retrieved from session"
  );

  // find user credential
  const activeCredential = await fetchCredentialById(id);
  if (!activeCredential) {
    logger.warn(`/assertion/result: No credential found with ID ${id}`);

    throw FailedAuthenticationError();
  }
  if (
    authentication.authenticatingUser &&
    activeCredential.user.id !== authentication.authenticatingUser.id
  ) {
    logger.warn(
      `/assertion/result: Presented credential (id = ${activeCredential.credentialID}) is not associated with specified user (id = ${authentication.authenticatingUser.id})`
    );

    throw FailedAuthenticationError();
  }

  // fetch associated user
  const existingUser = await fetchUserById(activeCredential.user.id);
  if (!existingUser) {
    // NOTE: this shouldn't happen unless there's a data integrity issue
    throw new Error(
      `Cannot find user (id = ${activeCredential.user.id}) associated with active credential (id =${activeCredential.credentialID})`
    );
  }

  // verify assertion
  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: authentication.challenge,
      expectedOrigin: baseUrl,
      expectedRPID: rpID,
      authenticator: {
        ...activeCredential,
        credentialID: isoBase64URL.toBuffer(activeCredential.credentialID),
        credentialPublicKey: isoBase64URL.toBuffer(
          activeCredential.credentialPublicKey
        ),
      },
    });
  } catch (err) {
    logger.warn(
      err,
      `Authentication error with user (id = ${existingUser.id}) and credential (id = ${activeCredential.credentialID})`
    );

    throw FailedAuthenticationError();
  }
  logger.debug(verification, "/assertion/result: verification");

  // complete authentication
  const return_to = signIn(req, activeCredential);

  // build response
  const resultResponse = {
    status: "ok",
    errorMessage: "",
    return_to,
  };

  res.json(resultResponse);
});

export default router;
