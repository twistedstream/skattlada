import { DateTime, Duration } from "luxon";
import { t } from "tap";

import { now } from "./time";

t.test("utils/time", async (t) => {
  t.test("now", async (t) => {
    t.test("returns a date that is close to actual now", async (t) => {
      const delta = Duration.fromMillis(10);
      const lowerLimit = DateTime.now().minus(delta);
      const upperLimit = DateTime.now().plus(delta);

      const result = now();
      t.ok(result > lowerLimit);
      t.ok(result < upperLimit);
    });

    t.test("returns a UTC date", async (t) => {
      const result = now();
      t.equal(result.toString(), result.toUTC().toString());
    });
  });
});
