import * as simpleWebAuthnServerDefaults from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import fs from "fs/promises";
import { StatusCodes } from "http-status-codes";
import { parse as parseHtml } from "node-html-parser";
import { parse as parseSetCookie } from "set-cookie-parser";
import sinon from "sinon";
import request, { Response as SupertestResponse } from "supertest";
import { Test } from "tap";

import path from "path";
import { InMemoryDataProvider } from "../../data/data-providers/in-memory";
import { LocalFileProvider } from "../../data/file-providers/local";
import { LocalMetadataProvider } from "../../data/metadata-providers/local";
import { Authenticator, FileInfo } from "../../types/entity";
import {
  InMemoryDataProviderOptions,
  IntegrationTestState,
} from "../../types/test";

// general

export async function createIntegrationTestState(
  t: Test,
  fileProvider: LocalFileProvider,
  dataProviderOptions: InMemoryDataProviderOptions,
): Promise<IntegrationTestState> {
  const verifyRegistrationResponseStub = sinon.stub();
  const verifyAuthenticationResponseStub = sinon.stub();

  const dataProvider = new InMemoryDataProvider(dataProviderOptions);
  await dataProvider.initialize();

  const metadataProvider = new LocalMetadataProvider();
  await metadataProvider.initialize();

  const { default: app } = t.mockRequire("../../app", {
    "../../data": {
      getDataProvider: () => dataProvider,
      getFileProvider: () => fileProvider,
      getMetadataProvider: () => metadataProvider,
    },
    "@simplewebauthn/server": {
      ...simpleWebAuthnServerDefaults,
      verifyRegistrationResponse: verifyRegistrationResponseStub,
      verifyAuthenticationResponse: verifyAuthenticationResponseStub,
    },
  });

  const { initializeServices } = t.mockRequire("../../services", {
    "../../data": {
      getDataProvider: () => dataProvider,
    },
  });

  return {
    app,
    cookies: {},
    csrfToken: "",
    redirectUrl: "",
    users: dataProviderOptions.users || [],
    credentials: dataProviderOptions.credentials || [],
    invites: dataProviderOptions.invites || [],
    shares: dataProviderOptions.shares || [],
    initializeServices,
    verifyRegistrationResponseStub,
    verifyAuthenticationResponseStub,
  };
}

function updateStateAfterRequest(
  state: IntegrationTestState,
  response: SupertestResponse,
) {
  // read set-cookie response header from server and update "browser" cookies
  const setCookieRaw = response.headers["set-cookie"];
  if (setCookieRaw) {
    const cookies = parseSetCookie(setCookieRaw);

    for (const cookie of cookies) {
      if (cookie.expires?.getTime() === 0) {
        delete state.cookies[cookie.name];
      } else {
        state.cookies[cookie.name] = cookie;
      }
    }
  }

  // capture CSRF token so it can be used with a future request
  const csrfToken = getCsrfToken(response);
  if (csrfToken) {
    state.csrfToken = csrfToken;
  }

  // capture redirect URL so it can be used with a future request
  const { location } = response.headers;
  const contentType = <string>(response.headers["content-type"] || "");
  let return_to: string = "";
  if (contentType.toLowerCase().startsWith("application/json")) {
    return_to = JSON.parse(response.text).return_to;
  }
  state.redirectUrl = location || return_to || "";
}

function getCsrfToken(response: SupertestResponse): string | undefined {
  const root = parseHtml(response.text);
  const csrfField = root.querySelector("input[name='csrf_token']");
  if (csrfField) {
    return csrfField.attributes.value;
  }
}

function buildCookieRequestHeader(state: IntegrationTestState): string {
  const cookies = Object.values(state.cookies);

  return cookies.reduce(
    (acc, cv) => `${acc}${acc ? "; " : ""}${cv.name}=${cv.value}`,
    "",
  );
}

// requests

export async function navigatePage(
  state: IntegrationTestState,
  path: string,
): Promise<SupertestResponse> {
  const { app } = state;

  const response = await request(app)
    .get(path)
    .set("cookie", buildCookieRequestHeader(state))
    .accept("text/html");
  updateStateAfterRequest(state, response);

  return response;
}

export async function postJson(
  state: IntegrationTestState,
  path: string,
  body: any,
): Promise<SupertestResponse> {
  const { app } = state;

  const response = await request(app)
    .post(path)
    .set("cookie", buildCookieRequestHeader(state))
    .set("content-type", "application/json")
    .accept("application/json")
    .send(body);
  updateStateAfterRequest(state, response);

  return response;
}

export async function postForm(
  state: IntegrationTestState,
  path: string,
  body: any,
): Promise<SupertestResponse> {
  const { app } = state;

  const response = await request(app)
    .post(path)
    .set("cookie", buildCookieRequestHeader(state))
    .set("content-type", "application/x-www-form-urlencoded")
    .accept("text/html")
    .send(body);
  updateStateAfterRequest(state, response);

  return response;
}

// response assertions

export function assertHtmlResponse(t: Test, response: SupertestResponse) {
  t.equal(response.status, StatusCodes.OK, "expected OK http status");
  t.match(
    response.headers["content-type"],
    "text/html",
    "expected html content",
  );
}

export function assertJsonResponse(
  t: Test,
  response: SupertestResponse,
  schemaTest: (json: any) => void,
) {
  t.equal(response.status, StatusCodes.OK, "expected OK http status");
  t.match(
    response.headers["content-type"],
    "application/json",
    "expected JSON content",
  );
  const json = JSON.parse(response.text);
  schemaTest(json);
}

export function assertRedirectResponse(
  t: Test,
  response: SupertestResponse,
  expectedLocation: string,
) {
  t.equal(
    response.status,
    StatusCodes.MOVED_TEMPORARILY,
    "expected 302 http status",
  );
  t.ok(response.headers.location, "http location exists");
  t.equal(
    response.headers.location,
    expectedLocation,
    "expected http location",
  );
}

export async function assertDownloadResponse(
  t: Test,
  response: SupertestResponse,
  expectedContentType: string,
  expectedContentFile: FileInfo,
) {
  t.equal(response.status, StatusCodes.OK, "expected OK http status");
  t.match(
    response.headers["content-type"],
    expectedContentType,
    "expected html content",
  );

  // string compare the response content with the expected test file
  const mediaType = expectedContentFile.availableMediaTypes.find(
    (t) => t.name === expectedContentType,
  );
  const fileName = `${expectedContentFile.title}.${mediaType?.extension}`;
  const fileData = await fs.readFile(
    path.join(__dirname, `../../data/file-providers/files/${fileName}`),
    { encoding: "utf-8" },
  );
  t.equal(response.text, fileData);

  response;
}

export function assertNoUsersOrCredentials(
  t: Test,
  state: IntegrationTestState,
) {
  t.equal(state.users.length, 0, "expected no users");
  t.equal(state.credentials.length, 0, "expected no credentials");
}

export function assertUserAndAssociatedCredentials(
  t: Test,
  state: IntegrationTestState,
  username: string,
  displayName: string,
  associatedCredentials: Authenticator[],
) {
  const foundUser = state.users.find(
    (u) => u.username === username && u.displayName === displayName,
  );
  t.ok(foundUser, "expected user");

  for (const credential of associatedCredentials) {
    const foundCredential = state.credentials.find(
      (c) =>
        c.credentialID === credential.credentialID &&
        c.user.id === foundUser?.id,
    );
    t.ok(foundCredential, "expected credential");
  }
}

// composite

export async function doRegistration(
  t: Test,
  state: IntegrationTestState,
  username: string,
  displayName: string,
  newCredential: Authenticator,
  isNewUser: boolean,
): Promise<void> {
  const optionsResponse = await postJson(state, "/fido2/attestation/options", {
    username: isNewUser ? username : "",
    displayName: isNewUser ? displayName : "",
    authenticatorSelection: {
      requireResidentKey: false,
      residentKey: "preferred",
      authenticatorAttachment: "platform",
      userVerification: "preferred",
    },
    attestation: "direct",
  });

  assertJsonResponse(t, optionsResponse, (json) => {
    t.equal(json.status, "ok", "expected FIDO status = ok");
    t.match(
      json,
      {
        challenge: /\S+/,
        rp: {
          id: "example.com",
          name: "Example",
        },
        user: {
          id: /\S+/,
          name: username,
          displayName: displayName,
        },
        excludeCredentials: [],
        attestation: "direct",
        authenticatorSelection: {
          residentKey: "preferred",
          requireResidentKey: false,
          userVerification: "preferred",
        },
      },
      "expected FIDO json response",
    );
  });

  const testValidatedCredential = {
    ...newCredential,
    credentialID: isoBase64URL.toBuffer(newCredential.credentialID),
    credentialPublicKey: isoBase64URL.toBuffer(
      newCredential.credentialPublicKey,
    ),
  };

  state.verifyRegistrationResponseStub.returns({
    registrationInfo: { ...testValidatedCredential },
  });

  const resultResponse = await postJson(state, "/fido2/attestation/result", {
    id: newCredential.credentialID,
    response: {
      // ignored since we're stubbing verifyRegistrationResponse
    },
  });

  assertJsonResponse(t, resultResponse, (json) => {
    t.equal(json.status, "ok", "expected FIDO status = ok");
    t.match(
      json,
      {
        return_to: "/",
      },
      "expected return_to in json",
    );
  });

  t.ok(state.verifyRegistrationResponseStub.called);
}

export async function doSignIn(
  t: Test,
  state: IntegrationTestState,
  username: string,
  expectedCredential: Authenticator,
): Promise<void> {
  const optionsResponse = await postJson(state, "/fido2/assertion/options", {
    username,
    userVerification: "preferred",
  });

  const associatedUser = state.users.find((u) => u.username === username);
  t.ok(associatedUser, `No user in test state with name: ${username}`);
  const allowCredentials = state.credentials
    .filter((c) => c.user.id === associatedUser?.id)
    .map((c) => ({
      type: "public-key",
      id: c.credentialID,
    }));

  assertJsonResponse(t, optionsResponse, (json) => {
    t.equal(json.status, "ok", "expected FIDO status = ok");
    t.match(json, {
      challenge: /\S+/,
      allowCredentials,
      userVerification: "preferred",
    });
  });

  state.verifyAuthenticationResponseStub.returns({});

  const resultResponse = await postJson(state, "/fido2/assertion/result", {
    id: expectedCredential.credentialID,
  });

  assertJsonResponse(t, resultResponse, (json) => {
    t.equal(json.status, "ok", "expected FIDO status = ok");
    t.match(
      json,
      {
        return_to: "/",
      },
      "expected return_to in json",
    );
  });

  t.ok(
    state.verifyAuthenticationResponseStub.called,
    "expected called: verifyAuthenticationResponse",
  );
}

export async function doSignOut(t: Test, state: IntegrationTestState) {
  const response = await navigatePage(state, "/logout");
  assertRedirectResponse(t, response, "/");
}
