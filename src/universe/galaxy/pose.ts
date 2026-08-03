export type GalaxyPoseInput = {
  mobile: boolean;
  presence: number;
  reducedMotion: boolean;
  travel: number;
};

export type GalaxyPose = {
  cameraDistance: number;
  diskSpin: number;
  frameTilt: number;
  scale: number;
  screenRoll: number;
  verticalOffset: number;
};

export function galaxyPoseFor({
  mobile,
  presence,
  reducedMotion,
  travel,
}: GalaxyPoseInput): GalaxyPose {
  return {
    cameraDistance: mobile ? 21.4 : 16.6,
    diskSpin: reducedMotion ? 0 : travel * 0.00011,
    frameTilt: -0.22,
    scale: 0.84 + presence * 0.16,
    screenRoll: -0.18,
    verticalOffset: -0.35,
  };
}
