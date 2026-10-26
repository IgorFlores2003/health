import test from "node:test";
import assert from "node:assert/strict";
import { hasConfirmedEmail, userStorageKey } from "../src/access.ts";
test("anonymous and unconfirmed accounts cannot access the dashboard", () => {
  for (const user of [
    null,
    undefined,
    {},
    { id: "a", email: "a@example.com" },
    { id: "a", email: "a@example.com", email_confirmed_at: null },
    { id: "a", email_confirmed_at: "2026-10-26" },
  ])
    assert.equal(hasConfirmedEmail(user), false);
  assert.equal(
    hasConfirmedEmail({
      id: "a",
      email: "a@example.com",
      email_confirmed_at: "2026-10-26",
    }),
    true,
  );
});
test("health records are separated by account and cannot use anonymous storage", () => {
  assert.notEqual(userStorageKey("account-a"), userStorageKey("account-b"));
  assert.notEqual(userStorageKey("account-a"), "ritmo-local-v1");
  assert.throws(() => userStorageKey(""), /obrigatória/);
});
