import test from "node:test";
import assert from "node:assert/strict";
import { initial, isPhotoPath, validState } from "../src/domain.ts";
const user = "3f2a9c1e-8b4d-4e6f-9a1b-2c3d4e5f6a7b";
test("only storage paths inside the user's folders are accepted", () => {
  for (const ok of [
    `${user}/profile/${user}.jpg`,
    `${user}/exercises/abc-123/${user}.webp`,
  ])
    assert.equal(isPhotoPath(ok), true);
  for (const bad of [
    "",
    "data:image/jpeg;base64,AAAA",
    "https://example.com/a.jpg",
    `${user}/profile/../x.jpg`,
    `${user}/other/a.jpg`,
    `${user}/profile/a.gif`,
    "not-a-uuid/profile/a.jpg",
    42,
  ])
    assert.equal(isPhotoPath(bad), false, String(bad));
});
test("snapshot keeps photo paths and rejects embedded images", () => {
  const exercise = {
    id: "e1",
    date: "2026-10-26",
    type: "Corrida",
    minutes: 30,
    intensity: "Moderada",
  };
  const photo = `${user}/exercises/e1/${user}.jpg`;
  const base = { ...initial, profile: { ...initial.profile } };
  assert.equal(
    validState({
      ...base,
      profile: { ...base.profile, photo: `${user}/profile/${user}.jpg` },
      exercises: [{ ...exercise, photos: [photo] }],
    }),
    true,
  );
  assert.equal(
    validState({
      ...base,
      profile: { ...base.profile, photo: "data:image/png;base64,AAAA" },
    }),
    false,
  );
  assert.equal(
    validState({
      ...base,
      exercises: [{ ...exercise, photos: Array(7).fill(photo) }],
    }),
    false,
  );
});
