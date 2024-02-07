import { findMetadata } from "../../services/metadata";
import { fetchCredentialsByUserId } from "../../services/user";
import { Authenticator, User } from "../../types/entity";

type PasskeyView = {
  id: string;
  description: string;
  is_synced: boolean;
  icon?: string;
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
  const passkeys = [...credentials].map((c) => {
    const metadata = findMetadata(c.aaguid);

    const { credentialID: id, credentialDeviceType: type } = c;
    const created = c.created.toISO();
    const is_synced = type === "multiDevice";
    const description = metadata?.description ?? "(unknown)";
    const icon = metadata?.icon;

    return {
      id,
      description,
      is_synced,
      icon,
      created,
    };
  });

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
