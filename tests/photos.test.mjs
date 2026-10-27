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
test("blood pressure records keep the monitor photo path", () => {
  const photo = `${user}/pressures/p1/${user}.jpg`;
  const pressure = {
    id: "p1",
    date: "2026-10-26",
    systolic: 120,
    diastolic: 80,
  };
  const base = { ...initial, profile: { ...initial.profile } };
  assert.equal(
    validState({ ...base, pressures: [{ ...pressure, photos: [photo] }] }),
    true,
  );
  assert.equal(
    validState({
      ...base,
      pressures: [{ ...pressure, photos: ["data:image/jpeg;base64,AAAA"] }],
    }),
    false,
  );
});
test("exercise duration keeps exact seconds, elevation and pulse elevation and pulse", async () => {
  const { parseDuration, formatDuration, durationLabel } =
    await import("../src/domain.ts");
  assert.equal(parseDuration("00:34"), 34);
  assert.equal(parseDuration("01:05"), 65);
  assert.equal(parseDuration("1:60"), null);
  assert.equal(parseDuration("34"), null);
  assert.equal(parseDuration("00:59:40") * 60, 3580);
  assert.equal(parseDuration("00:59:60"), null);
  assert.equal(formatDuration(3580 / 60), "00:59:40");
  assert.equal(formatDuration(65), "01:05:00");
  assert.equal(durationLabel(34), "34 min");
  assert.equal(durationLabel(3580 / 60), "59 min 40 s");
  assert.equal(durationLabel(65), "1h05");
  const base = { ...initial, profile: { ...initial.profile } };
  const ex = {
    id: "e1",
    date: "2026-10-26",
    type: "Caminhada",
    minutes: 60,
    intensity: "Leve",
    distanceKm: 3.69,
    elevationM: 50,
  };
  assert.equal(validState({ ...base, exercises: [ex] }), true);
  assert.equal(
    validState({ ...base, exercises: [{ ...ex, elevationM: -5 }] }),
    false,
  );
  const pr = {
    id: "p1",
    date: "2026-10-26",
    systolic: 128,
    diastolic: 81,
    pulse: 80,
  };
  assert.equal(validState({ ...base, pressures: [pr] }), true);
  assert.equal(
    validState({ ...base, pressures: [{ ...pr, pulse: 400 }] }),
    false,
  );
});
