import { assertValue } from "../../../utils/error";
import { fixDateTime } from "./dateTime";

export function fixCreated(target: { created: any }) {
  assertValue(target);

  fixDateTime(target, "created");
}
