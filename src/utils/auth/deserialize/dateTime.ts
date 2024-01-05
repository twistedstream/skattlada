import { DateTime } from "luxon";
import { assertValue } from "../../../utils/error";

export function fixDateTime(target: Record<string, any>, field: string) {
  assertValue(target);
  const value = target[field];

  if (value && typeof value === "string") {
    target[field] = DateTime.fromISO(value).toUTC();
  }
}
