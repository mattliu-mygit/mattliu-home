import { describe, expect, it } from "vitest";

import { galaxyPoseFor } from "./pose";

describe("galaxy pose", () => {
  it("keeps the viewing plane fixed while scroll spins the disk", () => {
    const atRest = galaxyPoseFor({
      mobile: false,
      presence: 1,
      reducedMotion: false,
      travel: 0,
    });
    const afterTravel = galaxyPoseFor({
      mobile: false,
      presence: 1,
      reducedMotion: false,
      travel: 4_200,
    });

    expect(afterTravel.frameTilt).toBe(atRest.frameTilt);
    expect(afterTravel.screenRoll).toBe(atRest.screenRoll);
    expect(atRest.diskSpin).toBe(0);
    expect(afterTravel.diskSpin).toBeCloseTo(0.462);
  });

  it("uses a nearly horizontal, slightly open, closer desktop view", () => {
    const pose = galaxyPoseFor({
      mobile: false,
      presence: 1,
      reducedMotion: false,
      travel: 0,
    });

    expect(Math.abs(pose.screenRoll)).toBeLessThan(Math.PI / 12);
    expect(Math.abs(pose.frameTilt)).toBeGreaterThan(0.15);
    expect(Math.abs(pose.frameTilt)).toBeLessThan(0.35);
    expect(pose.cameraDistance).toBe(16.6);
    expect(pose.scale).toBe(1);
    expect(pose.verticalOffset).toBe(-0.35);

    const mobilePose = galaxyPoseFor({
      mobile: true,
      presence: 1,
      reducedMotion: false,
      travel: 0,
    });
    expect(mobilePose.cameraDistance).toBe(21.4);
  });

  it("keeps the disk still for reduced motion", () => {
    const pose = galaxyPoseFor({
      mobile: false,
      presence: 1,
      reducedMotion: true,
      travel: 9_000,
    });

    expect(pose.diskSpin).toBe(0);
  });
});
