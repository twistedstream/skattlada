import sinon from "sinon";
import { t } from "tap";

import { DateTime } from "luxon";
import { fixDateTime } from "./dateTime";

//tests

t.test("utils/auth/deserialize/dateTime", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("fixDateTime", async (t) => {
    t.test("if empty target, throws expected error", async (t) => {
      const target: any = undefined;

      t.throws(() => fixDateTime(target, "foo"), {
        message: "Unexpected undefined value",
      });
    });

    t.test("if field does not exist, does nothing", async (t) => {
      const target = {};

      fixDateTime(target, "foo");

      t.same(target, {});
    });

    t.test("if field value not a string, does nothing", async (t) => {
      const target = { foo: 42 };

      fixDateTime(target, "foo");

      t.same(target, { foo: 42 });
    });

    t.test(
      "converts a string field value to the expected DateTime",
      async (t) => {
        const dt = DateTime.now();
        const target = { foo: dt.toISO() };

        fixDateTime(target, "foo");

        t.same(target, { foo: dt.toUTC() });
      },
    );
  });
});
