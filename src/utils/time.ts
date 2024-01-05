import { DateTime } from "luxon";

export function now(): DateTime {
  return DateTime.now().toUTC();
}
