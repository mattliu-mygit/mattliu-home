import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  DataTexture,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  WebGLRenderer,
} from "three";

import { GALAXY_DISK_RADIUS, type GalaxyField } from "./galaxy-field";
import { galaxyPoseFor } from "./galaxy-pose";
import { createGalaxyTexture } from "./galaxy-texture";

export type GalaxyFrame = {
  corePresence: number;
  presence: number;
  travel: number;
  velocity: number;
};

export type GalaxyRenderer = {
  dispose: () => void;
  render: (frame: GalaxyFrame) => void;
  resize: () => void;
};

type CreateGalaxyRendererOptions = {
  canvas: HTMLCanvasElement;
  context: WebGLRenderingContext | WebGL2RenderingContext;
  field: GalaxyField;
  reducedMotion: boolean;
};

const GALAXY_HAZE_LAYERS = [
  { offset: 0, opacity: 0.18, scale: 1, seed: 1618 },
  { offset: 0.28, opacity: 0.12, scale: 1.04, seed: 2441 },
  { offset: -0.26, opacity: 0.08, scale: 0.98, seed: 3733 },
] as const;
const GALAXY_CORE_RADIUS = 0.45;

const vertexShader = `
  attribute float alpha;
  attribute float size;
  varying float vAlpha;
  varying float vCoreWeight;
  varying vec3 vColor;
  uniform float pixelRatio;

  void main() {
    vAlpha = alpha;
    vCoreWeight = 1.0 - smoothstep(0.0, ${GALAXY_CORE_RADIUS.toFixed(2)}, length(position));
    vColor = color;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(size * pixelRatio * (28.0 / -viewPosition.z), 0.7, 8.0);
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying float vCoreWeight;
  varying vec3 vColor;
  uniform float corePresence;
  uniform float presence;

  void main() {
    float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
    if (distanceFromCenter > 0.5) discard;
    float core = 1.0 - smoothstep(0.08, 0.24, distanceFromCenter);
    float aura = 1.0 - smoothstep(0.08, 0.5, distanceFromCenter);
    float intensity = core + aura * 0.42;
    float stellarPresence = mix(presence, corePresence, vCoreWeight);
    gl_FragColor = vec4(vColor, intensity * vAlpha * stellarPresence);
  }
`;

export function createGalaxyRenderer({
  canvas,
  context,
  field,
  reducedMotion,
}: CreateGalaxyRendererOptions): GalaxyRenderer {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(field.positions, 3));
  geometry.setAttribute("color", new BufferAttribute(field.colors, 3));
  geometry.setAttribute("size", new BufferAttribute(field.sizes, 1));
  geometry.setAttribute("alpha", new BufferAttribute(field.alphas, 1));
  geometry.computeBoundingSphere();

  const material = new ShaderMaterial({
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader,
    transparent: true,
    uniforms: {
      corePresence: { value: 0 },
      pixelRatio: { value: 1 },
      presence: { value: 0 },
    },
    vertexColors: true,
    vertexShader,
  });
  const points = new Points(geometry, material);
  points.renderOrder = 1;
  const hazeGeometry = new PlaneGeometry(
    GALAXY_DISK_RADIUS * 2.08,
    GALAXY_DISK_RADIUS * 2.08,
  );
  const hazeLayers = GALAXY_HAZE_LAYERS.map((specification, index) => {
    const texture = new DataTexture(
      createGalaxyTexture({
        height: 256,
        seed: specification.seed,
        width: 256,
      }),
      256,
      256,
      RGBAFormat,
      UnsignedByteType,
    );
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.needsUpdate = true;
    const hazeMaterial = new MeshBasicMaterial({
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      map: texture,
      opacity: 0,
      side: DoubleSide,
      transparent: true,
    });
    const haze = new Mesh(hazeGeometry, hazeMaterial);
    haze.position.y = specification.offset;
    haze.rotation.x = -Math.PI / 2;
    haze.scale.setScalar(specification.scale);
    haze.renderOrder = 2 + index;
    return { haze, hazeMaterial, specification, texture };
  });
  const rotor = new Group();
  rotor.add(points, ...hazeLayers.map(({ haze }) => haze));
  const viewFrame = new Group();
  viewFrame.add(rotor);
  const scene = new Scene();
  scene.add(viewFrame);
  const camera = new PerspectiveCamera(48, 1, 0.1, 60);
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: false,
    canvas,
    context: context as WebGLRenderingContext,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  let lastRendered: GalaxyFrame | null = null;

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      width < 720 ? 1.25 : 1.5,
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    material.uniforms.pixelRatio.value = pixelRatio;
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    lastRendered = null;
  };

  const render = (frame: GalaxyFrame) => {
    if (
      lastRendered &&
      Math.abs(lastRendered.corePresence - frame.corePresence) < 0.0005 &&
      Math.abs(lastRendered.presence - frame.presence) < 0.0005 &&
      Math.abs(lastRendered.travel - frame.travel) < 0.04 &&
      Math.abs(lastRendered.velocity - frame.velocity) < 0.0005
    ) {
      return;
    }

    material.uniforms.corePresence.value = frame.corePresence;
    material.uniforms.presence.value = frame.presence;
    for (const { hazeMaterial, specification } of hazeLayers) {
      hazeMaterial.opacity = frame.presence * specification.opacity;
    }
    const pose = galaxyPoseFor({
      mobile: window.innerWidth < 720,
      presence: frame.presence,
      reducedMotion,
      travel: frame.travel,
    });
    viewFrame.rotation.x = pose.frameTilt;
    viewFrame.rotation.z = pose.screenRoll;
    viewFrame.position.y = pose.verticalOffset;
    viewFrame.scale.setScalar(pose.scale);
    rotor.rotation.y = pose.diskSpin;
    camera.position.z = pose.cameraDistance;
    renderer.render(scene, camera);
    lastRendered = frame;
  };

  resize();
  return {
    dispose: () => {
      geometry.dispose();
      hazeGeometry.dispose();
      for (const { hazeMaterial, texture } of hazeLayers) {
        hazeMaterial.dispose();
        texture.dispose();
      }
      material.dispose();
      renderer.dispose();
    },
    render,
    resize,
  };
}
