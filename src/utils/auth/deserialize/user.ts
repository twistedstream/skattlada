import { fixCreated } from "./created";

export function fixUser(target: { created: any }) {
  fixCreated(target);
}
