import { getDataProvider } from "../data";
import { Invite } from "../types/entity";
import { unique } from "../utils/identifier";
import { now } from "../utils/time";
import { newInvite } from "./invite";
import { loadMetadata } from "./metadata";

const provider = getDataProvider();
const { getUserCount, insertUser, insertInvite } = provider;

export async function initializeServices(): Promise<Invite | undefined> {
  await loadMetadata();

  // only if no users yet
  const count = await getUserCount();
  if (count === 0) {
    // create root admin
    const rootAdmin = await insertUser({
      id: unique(),
      created: now(),
      username: "root",
      displayName: "Root Admin",
      isAdmin: true,
    });

    // create first invite
    const firstInvite =
      await // call imported version of newInvite so it can be mocked
      newInvite(rootAdmin, true);
    return insertInvite(firstInvite);
  }
}
