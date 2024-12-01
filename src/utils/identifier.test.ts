import { t } from "tap";

import { unique } from "./identifier";

t.test("utils/identifier", async (t) => {
  t.test("unique", async (t) => {
    t.test("returns a string ID in the expected format", async (t) => {
      const result = unique();

      t.match(result, /^[\S]{22}/);
    });

    t.test("doesn't return the same ID twice", async (t) => {
      // generate a bunch of IDs
      const ids = Array.from({ length: 10 }).map(() => unique());

      // compare each for uniqueness
      for (let i: number = 0; i < ids.length; i++) {
        const thisId = ids[i];
        const otherIds = [...ids.slice(0, i), ...ids.slice(i + 1)];

        for (const id of otherIds) {
          t.not(id, thisId);
        }
      }
    });
  });
});
