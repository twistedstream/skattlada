import { assertValue } from "../../../utils/error";
import { fixCreated } from "./created";
import { fixDateTime } from "./dateTime";

export function fixRegisterableSource(target: {
  created: any;
  createdBy: any;
  claimed?: any;
  claimedBy?: any;
}): void {
  assertValue(target);

  fixCreated(target);
  fixCreated(target.createdBy);

  if (target.claimed) {
    fixDateTime(target, "claimed");
  }
  if (target.claimedBy) {
    fixCreated(target.claimedBy);
  }
}
