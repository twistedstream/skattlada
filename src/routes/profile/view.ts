import { CredentialDeviceType } from "@simplewebauthn/typescript-types";

import { fetchCredentialsByUserId } from "../../services/user";
import { Authenticator, User } from "../../types/entity";

type PasskeyView = {
  id: string;
  type: CredentialDeviceType;
  created: string | null;
};

export async function buildViewData(
  user: User,
  credential: Authenticator,
  csrf_token: string
): Promise<{
  csrf_token: string;
  username: string;
  display_name: string;
  display_name_error?: string;
  is_admin: boolean;
  passkeys: {
    active?: PasskeyView;
    others: PasskeyView[];
  };
}> {
  const credentials = await fetchCredentialsByUserId(user.id);
  const passkeys = [...credentials].map((c) => ({
    id: c.credentialID,
    type: c.credentialDeviceType,
    created: c.created.toISO(),
  }));

  const viewPasskeys = {
    active: passkeys.find((p) => p.id === credential.credentialID),
    others: passkeys.filter((p) => p.id !== credential.credentialID),
  };

  return {
    csrf_token,
    username: user.username,
    display_name: user.displayName,
    is_admin: user.isAdmin,
    passkeys: viewPasskeys,
  };
}
