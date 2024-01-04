import ShortUniqueId from "short-unique-id";

const uid = new ShortUniqueId({ length: 25 });

export function unique(): string {
  return uid();
}
