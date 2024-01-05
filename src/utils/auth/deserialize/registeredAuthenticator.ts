import { assertValue } from "../../../utils/error";
import { fixCreated } from "./created";

export function fixRegisteredAuthenticator(target: { user: any }) {
  assertValue(target);

  if (target.user) {
    fixCreated(target.user);
  }
}
