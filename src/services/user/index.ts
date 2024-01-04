import { getDataProvider } from "../../data";
import {
  Authenticator,
  RegisteredAuthenticator,
  User,
} from "../../types/entity";
import { unique } from "../../utils/identifier";
import { now } from "../../utils/time";
import { validateUser } from "./validation";

const provider = getDataProvider();
const {
  insertCredential,
  insertUser,
  findCredentialById,
  findUserById,
  findUserByName,
  updateUser,
  findUserCredential,
  findCredentialsByUser,
  deleteCredential,
} = provider;

// service

export async function fetchUserById(userID: string): Promise<User | undefined> {
  return findUserById(userID);
}

export async function fetchUserByName(
  username: string
): Promise<User | undefined> {
  return findUserByName(username);
}

export async function newUser(
  username: string,
  displayName: string
): Promise<User> {
  const user: User = {
    id: unique(),
    created: now(),
    username,
    displayName,
    // default new users to not be admin
    isAdmin: false,
  };
  validateUser(user);

  return user;
}

export async function registerUser(
  registeringUser: User,
  firstCredential: Authenticator
): Promise<User> {
  validateUser(registeringUser);

  const addedUser = await insertUser(registeringUser);
  await insertCredential(addedUser.id, firstCredential);

  return addedUser;
}

export async function modifyUser(user: User): Promise<void> {
  // validate
  validateUser(user);

  const foundUser = await findUserById(user.id);
  if (!foundUser) {
    throw new Error(`User with ID '${user.id}' does not exist.`);
  }

  // update user in DB
  await updateUser(user);
}

export async function fetchCredentialById(
  credentialID: string
): Promise<RegisteredAuthenticator | undefined> {
  return findCredentialById(credentialID);
}

export async function fetchCredentialsByUserId(
  userID: string
): Promise<RegisteredAuthenticator[]> {
  return findCredentialsByUser(userID);
}

export async function fetchCredentialsByUsername(
  username: string
): Promise<RegisteredAuthenticator[]> {
  const user = await findUserByName(username);

  if (user) {
    return findCredentialsByUser(user.id);
  }
  return [];
}

export async function addUserCredential(
  existingUserId: string,
  newCredential: Authenticator
) {
  if (await findUserCredential(existingUserId, newCredential.credentialID)) {
    throw new Error(
      `Credential with ID '${newCredential.credentialID}' already exists`
    );
  }
  if (!(await findUserById(existingUserId))) {
    throw new Error(`User with ID '${existingUserId}' not found`);
  }

  await insertCredential(existingUserId, newCredential);
}

export async function removeUserCredential(
  existingUserId: string,
  existingCredentialId: string
) {
  if (!(await findUserCredential(existingUserId, existingCredentialId))) {
    throw new Error(
      `Credential with ID '${existingCredentialId}' not associated with user with ID '${existingUserId}'`
    );
  }
  if ((await findCredentialsByUser(existingUserId)).length === 1) {
    throw new Error(
      `Cannot remove the last credential with ID '${existingCredentialId}' associated with user with ID '${existingUserId}'`
    );
  }

  await deleteCredential(existingCredentialId);
}
