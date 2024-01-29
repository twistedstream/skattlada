import ShortUniqueId from "short-unique-id";

const { randomUUID } = new ShortUniqueId({ length: 25 });

export function unique(): string {
  return randomUUID();
}
