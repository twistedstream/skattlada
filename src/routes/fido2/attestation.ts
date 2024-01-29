import {
  VerifiedRegistrationResponse,
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { json } from "body-parser";
import { Response, Router } from "express";

import {
  addUserCredential,
  fetchCredentialById,
  fetchCredentialsByUserId,
  fetchUserById,
  fetchUserByName,
  newUser,
  registerUser,
} from "../../services/user";
import {
  Authenticator,
  RegisteredAuthenticator,
  User,
} from "../../types/entity";
import { AuthenticatedRequest } from "../../types/express";
import {
  beginSignup,
  getRegisterable,
  getRegistration,
  signIn,
} from "../../utils/auth";
import { baseUrl, rpID, rpName } from "../../utils/config";
import {
  BadRequestError,
  ForbiddenError,
  assertValue,
} from "../../utils/error";
import { logger } from "../../utils/logger";
import { now } from "../../utils/time";

const router = Router();

// endpoints

router.post(
  "/options",
  json(),
  async (req: AuthenticatedRequest, res: Response) => {
    const { username, displayName, attestation } = req.body;

    let registeringUser: User | undefined;
    let excludeCredentials: RegisteredAuthenticator[];

    if (req.user) {
      // registering user is an existing user
      registeringUser = await fetchUserById(req.user.id);
      if (!registeringUser) {
        throw BadRequestError(`User with ID ${req.user.id} no longer exists`);
      }

      // going to exclude existing credentials
      excludeCredentials = await fetchCredentialsByUserId(req.user.id);
      if (excludeCredentials.length === 0) {
        // NOTE: this shouldn't happen unless there's a data integrity issue
        throw new Error(
          `Existing user ${registeringUser.id} is missing credentials.`
        );
      }
    } else {
      // retrieve invitation state from session
      if (!getRegisterable(req)) {
        throw ForbiddenError(
          "Cannot register a new user without a registerable session"
        );
      }

      // register user will be a new user
      try {
        registeringUser = await newUser(username, displayName);
      } catch (err: any) {
        if (err.type === "validation") {
          throw BadRequestError(err.message, err.context);
        }
        throw err;
      }
      // no existing credentials to exclude
      excludeCredentials = [];

      const existingUser = await fetchUserByName(username);
      if (existingUser) {
        throw BadRequestError(
          `A user with username '${username}' already exists`,
          "User.username"
        );
      }
    }

    // generate options
    const attestationOptions = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: registeringUser.id,
      userName: registeringUser.username,
      userDisplayName: registeringUser.displayName,
      attestationType: attestation,
      excludeCredentials: excludeCredentials.map((c) => ({
        id: isoBase64URL.toBuffer(c.credentialID),
        type: "public-key",
        transports: c.transports,
      })),
    });

    // build response
    const optionsResponse = {
      ...attestationOptions,
      status: "ok",
      errorMessage: "",
    };
    logger.info(optionsResponse, "Registration challenge response");

    // store registration state in session
    beginSignup(req, optionsResponse.challenge, registeringUser);

    res.json(optionsResponse);
  }
);

router.post(
  "/result",
  json(),
  async (req: AuthenticatedRequest, res: Response) => {
    // validate request
    const { body } = req;
    const { id, response } = body;
    if (!id) {
      throw BadRequestError("Missing: credential ID");
    }
    if (!response) {
      throw BadRequestError("Missing: authentication response");
    }

    // retrieve registration state from session
    const registration = getRegistration(req);
    if (!registration) {
      throw BadRequestError("No active registration");
    }
    logger.debug(
      registration,
      "/attestation/result: Registration state retrieved from session"
    );

    //verify registration
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: registration.challenge,
        expectedOrigin: baseUrl,
        expectedRPID: rpID,
      });
    } catch (err: any) {
      logger.warn(
        err,
        `Registration error with user with ID ${registration.registeringUser.id} and credential ${id}`
      );

      throw BadRequestError(`Registration failed: ${err.message}`);
    }
    logger.debug(verification, "/attestation/result: verification");

    // build credential object
    const registrationInfo = assertValue(verification.registrationInfo);
    const {
      aaguid,
      credentialPublicKey,
      credentialID,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo;
    const validatedCredential: Authenticator = {
      created: now(),
      credentialID: isoBase64URL.fromBuffer(credentialID),
      credentialPublicKey: isoBase64URL.fromBuffer(credentialPublicKey),
      counter,
      aaguid,
      credentialDeviceType,
      credentialBackedUp,
      transports: response.transports,
    };
    logger.debug(
      validatedCredential,
      "/attestation/result: Validated credential"
    );

    let { user } = req;
    let return_to = "/";
    if (user) {
      // update existing user in rp with additional credential
      await addUserCredential(user.id, validatedCredential);
    } else {
      // confirm we have a registerable session
      const registerable = getRegisterable(req);
      if (!registerable) {
        throw BadRequestError("No active registerable session");
      }
      logger.debug(
        registerable,
        "/attestation/result: Registerable state retrieved from session"
      );

      // create new user in rp with initial credential
      const { registeringUser } = registration;
      registeringUser.isAdmin = registerable.source.isAdmin;
      user = await registerUser(registeringUser, validatedCredential);

      // fetch registered credential
      const credential = assertValue(
        await fetchCredentialById(validatedCredential.credentialID)
      );

      // complete authentication
      return_to = signIn(req, credential);
    }

    // build response
    const resultResponse = {
      status: "ok",
      errorMessage: "",
      return_to,
    };

    res.json(resultResponse);
  }
);

export default router;
