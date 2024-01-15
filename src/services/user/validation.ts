import { User } from "../../types/entity";
import { ValidationError } from "../../types/error";

const USER_NAME_PATTERN = /^[a-zA-Z0-9_\-]{3,100}$/;
const USER_DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9\- ]{2,200}$/;

export function validateUser(user: User) {
  if (user.username.trim().length === 0) {
    throw new ValidationError("User", "username", `Username cannot be empty`);
  }
  if (!USER_NAME_PATTERN.test(user.username)) {
    throw new ValidationError(
      "User",
      "username",
      `Username must match pattern: ${USER_NAME_PATTERN}`
    );
  }
  if (user.displayName.trim().length === 0) {
    throw new ValidationError(
      "User",
      "displayName",
      `Display name cannot be empty`
    );
  }
  if (!USER_DISPLAY_NAME_PATTERN.test(user.displayName)) {
    throw new ValidationError(
      "User",
      "displayName",
      `Display name must match pattern: ${USER_DISPLAY_NAME_PATTERN}`
    );
  }
}
