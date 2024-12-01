import sinon from "sinon";
import { test } from "tap";

import { redirectBack } from "./express";

// test objects

const res: any = {
  redirect: sinon.stub(),
};

// tests

test("utils/express", async (t) => {
  t.beforeEach(async () => {
    sinon.resetBehavior();
    sinon.resetHistory();
  });

  t.test("redirectBack", async (t) => {
    t.test("if referrer exists, redirects to it", async (t) => {
      const req: any = { get: sinon.stub().returns("/foo") };

      redirectBack(req, res);

      t.ok(req.get.called);
      t.equal(req.get.firstCall.args[0], "Referrer");
      t.ok(res.redirect.called);
      t.ok(res.redirect.firstCall.args[0], "/foo");
    });

    t.test("if referrer doesn't exists, redirects to /", async (t) => {
      const req: any = { get: sinon.stub().returns(undefined) };

      redirectBack(req, res);

      t.ok(req.get.called);
      t.equal(req.get.firstCall.args[0], "Referrer");
      t.ok(res.redirect.called);
      t.ok(res.redirect.firstCall.args[0], "/");
    });
  });
});
