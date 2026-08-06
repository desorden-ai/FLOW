"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ProjectPicture } from "./ProjectPicture";

const THREE_VENDOR = "/api/vendor?library=three";
const GSAP_VENDOR = "/api/vendor?library=gsap";
const SCROLL_TRIGGER_VENDOR = "/api/vendor?library=scroll-trigger";
const GRID_WIDTH = 200;
const GRID_HEIGHT = 300;
const PARTICLE_COUNT = GRID_WIDTH * GRID_HEIGHT;
const HERO_HANDOFF_PROGRESS = 0.72;
const CAMERA_Z = 7.2;
const MOBILE_FOV = 42;
const DESKTOP_FOV = 38;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeToHydration = () => () => undefined;

const vertexShader = `
  attribute vec2 aUv;
  attribute vec3 aScatter;
  attribute float aDepth;
  attribute float aSeed;

  uniform float uDisperse;
  uniform float uDepth;
  uniform float uFade;
  uniform float uPointSize;
  uniform float uTime;

  varying vec2 vUv;
  varying float vDisperse;
  varying float vFade;

  void main() {
    float phaseOne = smoothstep(0.0, 1.0, uDisperse);
    float phaseTwo = smoothstep(0.0, 1.0, uDepth);
    float acceleratedDepth = pow(phaseTwo, 1.72);

    vec3 transformed = position;
    float radialLength = max(length(position.xy), 0.0001);
    vec2 radialDirection = position.xy / radialLength;

    float slowNoise = sin(
      uTime * (0.72 + aSeed * 1.35) +
      aSeed * 42.0
    );
    vec2 orbitalNoise = vec2(
      cos(uTime * 0.82 + aSeed * 51.0),
      sin(uTime * 0.68 + aSeed * 37.0)
    );

    // Fase 1: separación radial claramente perceptible y polvo flotante continuo.
    transformed.xy += aScatter.xy * phaseOne;
    transformed.xy += radialDirection * (0.055 + aSeed * 0.18) * phaseOne;
    transformed.xy += orbitalNoise * (0.032 + slowNoise * 0.018) * phaseOne;
    transformed.z += aScatter.z * phaseOne * 0.58;

    // Fase 2: las partículas aceleran hacia cámara y se expanden alrededor del bloque 2.
    transformed.z += (0.75 + aDepth * 5.85) * acceleratedDepth;
    transformed.xy += aScatter.xy * acceleratedDepth * 1.9;
    transformed.xy += radialDirection * acceleratedDepth * 0.28;

    vec4 modelPosition = modelViewMatrix * vec4(transformed, 1.0);
    float perspective = clamp(${CAMERA_Z.toFixed(1)} / max(0.66, -modelPosition.z), 0.78, 8.2);
    float solidCoverage = mix(1.18, 0.34, phaseOne) * (1.0 + acceleratedDepth * 0.88);

    // Al dispersarse, cada punto se hace pequeño para revelar huecos y movimiento real.
    gl_PointSize = uPointSize * perspective * solidCoverage;
    gl_Position = projectionMatrix * modelPosition;

    vUv = aUv;
    vDisperse = phaseOne;
    vFade = clamp(uFade, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform sampler2D uTexture;

  varying vec2 vUv;
  varying float vDisperse;
  varying float vFade;

  void main() {
    vec2 cellOffset = vec2(
      (gl_PointCoord.x - 0.5) / ${GRID_WIDTH.toFixed(1)},
      (gl_PointCoord.y - 0.5) / ${GRID_HEIGHT.toFixed(1)}
    );
    vec2 sampleUv = vUv + cellOffset;

    if (
      sampleUv.x < 0.0 || sampleUv.x > 1.0 ||
      sampleUv.y < 0.0 || sampleUv.y > 1.0
    ) discard;

    vec4 sampledColor = texture2D(uTexture, sampleUv);
    float luminance = dot(sampledColor.rgb, vec3(0.2126, 0.7152, 0.0722));

    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float circularParticle = smoothstep(0.51, 0.11, distanceToCenter);
    float brightPixel = smoothstep(0.018, 0.48, luminance);

    // Conserva parte de los medios tonos para que la nube no desaparezca al primer gesto.
    float dustVisibility = mix(1.0, max(0.2, brightPixel), smoothstep(0.06, 0.58, vDisperse));
    float alpha = sampledColor.a * circularParticle * dustVisibility * (1.0 - vFade);

    if (alpha < 0.004) discard;

    vec3 dustColor = mix(
      sampledColor.rgb,
      vec3(mix(luminance, 1.0, 0.38)),
      vDisperse * 0.42
    );

    gl_FragColor = vec4(dustColor, alpha);
  }
`;

type UniformNumber = { value: number };
type TextureLike = {
  needsUpdate: boolean;
  generateMipmaps: boolean;
  minFilter?: unknown;
  magFilter?: unknown;
  colorSpace?: unknown;
  dispose(): void;
};
type UniformMap = {
  uTexture: { value: TextureLike };
  uDisperse: UniformNumber;
  uDepth: UniformNumber;
  uFade: UniformNumber;
  uPointSize: UniformNumber;
  uTime: UniformNumber;
};
type VectorLike = {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): void;
};
type ScaleLike = {
  set(x: number, y: number, z: number): void;
};
type BufferGeometryLike = {
  setAttribute(name: string, attribute: unknown): void;
  dispose(): void;
};
type MaterialLike = {
  uniforms: UniformMap;
  dispose(): void;
};
type PointsLike = {
  position: VectorLike;
  scale: ScaleLike;
  frustumCulled: boolean;
};
type SceneLike = {
  add(object: unknown): void;
};
type CameraLike = {
  aspect: number;
  fov: number;
  position: VectorLike;
  updateProjectionMatrix(): void;
};
type RendererLike = {
  setClearColor(color: number, alpha: number): void;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  render(scene: SceneLike, camera: CameraLike): void;
  dispose(): void;
};
type ThreeLike = {
  Scene: new () => SceneLike;
  PerspectiveCamera: new (
    fieldOfView: number,
    aspect: number,
    near: number,
    far: number,
  ) => CameraLike;
  WebGLRenderer: new (options: {
    canvas: HTMLCanvasElement;
    alpha: boolean;
    antialias: boolean;
    powerPreference: "high-performance";
  }) => RendererLike;
  BufferGeometry: new () => BufferGeometryLike;
  Float32BufferAttribute: new (values: Float32Array, itemSize: number) => unknown;
  ShaderMaterial: new (options: Record<string, unknown>) => MaterialLike;
  Texture: new (image?: TexImageSource) => TextureLike;
  Points: new (geometry: BufferGeometryLike, material: MaterialLike) => PointsLike;
  LinearFilter?: unknown;
  SRGBColorSpace?: unknown;
};
type TweenLike = { kill(): void };
type GsapLike = {
  registerPlugin(plugin: unknown): void;
  to(target: object, variables: Record<string, unknown>): TweenLike;
};
type ScrollTriggerLike = {
  refresh(): void;
};
type HeroProgressDetail = {
  progress: number;
  active: boolean;
  sceneIndex: number;
};
type HeroParticlePortraitProps = {
  imageUrl?: string;
};
type MeshSyncContext = {
  wrapper: HTMLElement;
  image: HTMLImageElement;
  camera: CameraLike;
  renderer: RendererLike;
  material: MaterialLike;
  particles: PointsLike;
};

declare global {
  interface Window {
    THREE?: ThreeLike;
    gsap?: GsapLike;
    ScrollTrigger?: ScrollTriggerLike;
  }
}

const scriptPromises = new Map<string, Promise<void>>();

function loadScript(source: string, isReady: () => boolean) {
  if (isReady()) return Promise.resolve();

  const existingPromise = scriptPromises.get(source);
  if (existingPromise) return existingPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${source}"]`);

    const handleReady = () => {
      if (isReady()) resolve();
      else reject(new Error(`Library did not initialize: ${source}`));
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleReady, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error(`Unable to load ${source}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = source;
    script.async = true;
    script.addEventListener("load", handleReady, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error(`Unable to load ${source}`)),
      { once: true },
    );
    document.head.append(script);
  });

  scriptPromises.set(source, promise);
  return promise;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function waitForImage(image: HTMLImageElement, signal: AbortSignal) {
  if (image.complete && image.naturalWidth > 0) {
    return image.decode().catch(() => undefined);
  }

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      signal.removeEventListener("abort", handleAbort);
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
    const handleAbort = () => {
      cleanup();
      reject(new DOMException("Image loading aborted", "AbortError"));
    };
    const handleLoad = () => {
      cleanup();
      void image.decode().catch(() => undefined).finally(resolve);
    };
    const handleError = () => {
      cleanup();
      reject(new Error(`Unable to load hero image: ${image.currentSrc || image.src}`));
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
  });
}

function createPortraitGrid() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const uvs = new Float32Array(PARTICLE_COUNT * 2);
  const scatters = new Float32Array(PARTICLE_COUNT * 3);
  const depths = new Float32Array(PARTICLE_COUNT);
  const seeds = new Float32Array(PARTICLE_COUNT);
  const random = createSeededRandom(20260806);

  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const index = y * GRID_WIDTH + x;
      const positionOffset = index * 3;
      const uvOffset = index * 2;
      const u = (x + 0.5) / GRID_WIDTH;
      const v = 1 - (y + 0.5) / GRID_HEIGHT;
      const angle = random() * Math.PI * 2;
      const radius = 0.1 + random() * 0.58;
      const verticalDrift = (random() - 0.5) * 0.52;

      positions[positionOffset] = u - 0.5;
      positions[positionOffset + 1] = v - 0.5;
      positions[positionOffset + 2] = 0;

      uvs[uvOffset] = u;
      uvs[uvOffset + 1] = v;

      scatters[positionOffset] = Math.cos(angle) * radius;
      scatters[positionOffset + 1] = Math.sin(angle) * radius + verticalDrift;
      scatters[positionOffset + 2] = (random() - 0.5) * 2.4;

      depths[index] = 0.32 + random() * 0.88;
      seeds[index] = random();
    }
  }

  return { positions, uvs, scatters, depths, seeds };
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function getRendererPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, isMobileViewport() ? 1.5 : 1.8);
}

function getWorldUnitsPerCssPixel(camera: CameraLike, viewportHeight: number) {
  const fieldOfViewRadians = camera.fov * Math.PI / 180;
  const visibleWorldHeight = 2 * Math.tan(fieldOfViewRadians / 2) * Math.abs(camera.position.z);
  return visibleWorldHeight / Math.max(1, viewportHeight);
}

function syncMeshToImage({
  wrapper,
  image,
  camera,
  renderer,
  material,
  particles,
}: MeshSyncContext) {
  const viewportWidth = Math.max(1, window.innerWidth);
  const viewportHeight = Math.max(1, window.innerHeight);
  const imageRect = image.getBoundingClientRect();

  if (imageRect.width <= 0 || imageRect.height <= 0) return false;

  camera.fov = isMobileViewport() ? MOBILE_FOV : DESKTOP_FOV;
  camera.aspect = viewportWidth / viewportHeight;
  camera.updateProjectionMatrix();

  const pixelRatio = getRendererPixelRatio();
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(viewportWidth, viewportHeight, false);

  const worldUnitsPerCssPixel = getWorldUnitsPerCssPixel(camera, viewportHeight);
  const meshWidth = imageRect.width * worldUnitsPerCssPixel;
  const meshHeight = imageRect.height * worldUnitsPerCssPixel;
  const centerX = imageRect.left + imageRect.width / 2;
  const centerY = imageRect.top + imageRect.height / 2;
  const worldX = (centerX - viewportWidth / 2) * worldUnitsPerCssPixel;
  const worldY = (viewportHeight / 2 - centerY) * worldUnitsPerCssPixel;

  particles.position.set(worldX, worldY, 0);
  particles.scale.set(meshWidth, meshHeight, 1);

  const cellWidthCss = imageRect.width / GRID_WIDTH;
  const cellHeightCss = imageRect.height / GRID_HEIGHT;
  material.uniforms.uPointSize.value = Math.max(
    1.45,
    Math.max(cellWidthCss, cellHeightCss) * pixelRatio * 1.22,
  );

  wrapper.dataset.textureAspect = (
    image.naturalWidth / Math.max(1, image.naturalHeight)
  ).toFixed(6);
  wrapper.dataset.renderedAspect = (imageRect.width / imageRect.height).toFixed(6);
  wrapper.dataset.meshLeft = imageRect.left.toFixed(3);
  wrapper.dataset.meshTop = imageRect.top.toFixed(3);
  wrapper.dataset.meshWidth = imageRect.width.toFixed(3);
  wrapper.dataset.meshHeight = imageRect.height.toFixed(3);

  return true;
}

export function HeroParticlePortrait({
  imageUrl = "/media/hero/portada-chico-bn.webp",
}: HeroParticlePortraitProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!hydrated) return;

    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const shell = wrapper?.closest<HTMLElement>(".site-shell");
    const hero = shell?.querySelector<HTMLElement>("#intro");
    const fallbackImage = wrapper?.querySelector<HTMLImageElement>(
      ".hero-particle-portrait__fallback img",
    );

    if (!wrapper || !canvas || !shell || !hero || !fallbackImage) return;

    const abortController = new AbortController();
    const tweens = new Set<TweenLike>();
    let geometry: BufferGeometryLike | null = null;
    let material: MaterialLike | null = null;
    let texture: TextureLike | null = null;
    let renderer: RendererLike | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let animationFrame = 0;
    let syncFrame = 0;
    let destroyed = false;

    const initialize = async () => {
      await Promise.all([
        loadScript(THREE_VENDOR, () => Boolean(window.THREE)),
        loadScript(GSAP_VENDOR, () => Boolean(window.gsap)),
        waitForImage(fallbackImage, abortController.signal),
      ]);
      await loadScript(SCROLL_TRIGGER_VENDOR, () => Boolean(window.ScrollTrigger));

      if (abortController.signal.aborted || destroyed) return;

      const THREE = window.THREE;
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;

      if (!THREE || !gsap || !ScrollTrigger) {
        throw new Error("WebGL animation libraries are unavailable");
      }

      gsap.registerPlugin(ScrollTrigger);

      const portraitGrid = createPortraitGrid();
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        isMobileViewport() ? MOBILE_FOV : DESKTOP_FOV,
        window.innerWidth / Math.max(1, window.innerHeight),
        0.1,
        100,
      );
      camera.position.set(0, 0, CAMERA_Z);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);

      texture = new THREE.Texture(fallbackImage);
      texture.generateMipmaps = false;
      if (THREE.LinearFilter) {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
      }
      if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(portraitGrid.positions, 3));
      geometry.setAttribute("aUv", new THREE.Float32BufferAttribute(portraitGrid.uvs, 2));
      geometry.setAttribute("aScatter", new THREE.Float32BufferAttribute(portraitGrid.scatters, 3));
      geometry.setAttribute("aDepth", new THREE.Float32BufferAttribute(portraitGrid.depths, 1));
      geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(portraitGrid.seeds, 1));

      const uniforms: UniformMap = {
        uTexture: { value: texture },
        uDisperse: { value: 0 },
        uDepth: { value: 0 },
        uFade: { value: 0 },
        uPointSize: { value: 1 },
        uTime: { value: 0 },
      };

      material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });

      const particles = new THREE.Points(geometry, material);
      particles.frustumCulled = false;
      scene.add(particles);

      const heroCopy = hero.querySelector<HTMLElement>(".intro-heading");
      const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

      const addTween = (tween: TweenLike) => {
        tweens.add(tween);
        return tween;
      };

      const tweenUniform = (
        uniform: UniformNumber,
        value: number,
        duration: number,
        ease: string,
      ) => addTween(gsap.to(uniform, {
        value,
        duration: reducedMotion ? 0 : duration,
        ease,
        overwrite: true,
      }));

      const scheduleMeshSync = () => {
        window.cancelAnimationFrame(syncFrame);
        syncFrame = window.requestAnimationFrame(() => {
          if (destroyed || !renderer || !material) return;
          syncMeshToImage({
            wrapper,
            image: fallbackImage,
            camera,
            renderer,
            material,
            particles,
          });
          ScrollTrigger.refresh();
        });
      };

      const getActiveSceneIndex = () => {
        const scenes = Array.from(shell.querySelectorAll<HTMLElement>("[data-scene]"));
        return scenes.findIndex((sceneElement) => sceneElement.dataset.state === "current");
      };

      const setLayerVisibility = (
        fallbackOpacity: number,
        canvasOpacity: number,
        veilOpacity: number,
      ) => {
        wrapper.style.setProperty("--hero-fallback-opacity", String(fallbackOpacity));
        wrapper.style.setProperty("--hero-canvas-opacity", String(canvasOpacity));
        wrapper.style.setProperty("--hero-veil-opacity", String(veilOpacity));
        wrapper.dataset.renderSource = canvasOpacity > 0 ? "webgl" : "html";
      };

      const applyHeroState = (progress: number, immediate = false) => {
        const disperse = clamp(progress / 0.5);
        const duration = immediate ? 0 : 0.92;
        const isIdle = progress <= 0.001;

        wrapper.dataset.overlay = "hero";
        wrapper.dataset.phase = isIdle ? "idle" : "hero-particles";
        wrapper.dataset.particleMotion = isIdle ? "idle" : "dispersing";
        wrapper.dataset.disperseTarget = disperse.toFixed(3);
        wrapper.dataset.depthTarget = "0.000";
        wrapper.dataset.fadeTarget = "0.000";
        wrapper.style.setProperty("--hero-layer-opacity", "1");
        setLayerVisibility(isIdle ? 1 : 0.16, isIdle ? 0 : 1, isIdle ? 1 : 0.46);

        tweenUniform(uniforms.uDisperse, disperse, duration, "power3.out");
        tweenUniform(uniforms.uDepth, 0, duration * 0.65, "power2.out");
        tweenUniform(uniforms.uFade, 0, duration * 0.55, "power2.out");

        if (heroCopy) {
          addTween(gsap.to(heroCopy, {
            opacity: 1,
            y: 0,
            duration: reducedMotion || immediate ? 0 : 0.45,
            ease: "power2.out",
            overwrite: true,
          }));
        }
      };

      const applyPitchState = () => {
        const pitchDepth = clamp((HERO_HANDOFF_PROGRESS - 0.5) * 0.55);

        wrapper.dataset.overlay = "pitch";
        wrapper.dataset.phase = "pitch-particles";
        wrapper.dataset.particleMotion = "over-pitch";
        wrapper.dataset.disperseTarget = "1.000";
        wrapper.dataset.depthTarget = pitchDepth.toFixed(3);
        wrapper.dataset.fadeTarget = "0.000";
        wrapper.style.setProperty("--hero-layer-opacity", "1");
        setLayerVisibility(0, 1, 0);

        tweenUniform(uniforms.uDisperse, 1, 0.72, "power2.out");
        tweenUniform(uniforms.uDepth, pitchDepth, 0.82, "power2.inOut");
        tweenUniform(uniforms.uFade, 0, 0.25, "power2.out");

        if (heroCopy) {
          addTween(gsap.to(heroCopy, {
            opacity: 0,
            y: -24,
            duration: reducedMotion ? 0 : 0.46,
            ease: "power2.out",
            overwrite: true,
          }));
        }
      };

      const applyBlockThreeState = () => {
        wrapper.dataset.overlay = "leaving";
        wrapper.dataset.phase = "block-3-fade";
        wrapper.dataset.particleMotion = "depth-fade";
        wrapper.dataset.disperseTarget = "1.000";
        wrapper.dataset.depthTarget = "1.000";
        wrapper.dataset.fadeTarget = "1.000";
        wrapper.style.setProperty("--hero-layer-opacity", "1");
        setLayerVisibility(0, 1, 0);

        tweenUniform(uniforms.uDisperse, 1, 0.25, "power2.out");
        tweenUniform(uniforms.uDepth, 1, 1.42, "power3.in");
        tweenUniform(uniforms.uFade, 1, 1.55, "power2.inOut");
      };

      const hideParticleLayer = () => {
        wrapper.dataset.overlay = "hidden";
        wrapper.dataset.phase = "hidden";
        wrapper.dataset.particleMotion = "hidden";
        wrapper.style.setProperty("--hero-layer-opacity", "0");
        setLayerVisibility(0, 0, 0);
        tweenUniform(uniforms.uFade, 1, 0, "none");
      };

      const handleHeroProgress = (event: Event) => {
        const detail = (event as CustomEvent<HeroProgressDetail>).detail;
        if (!detail) return;

        const activeSceneIndex = getActiveSceneIndex();
        wrapper.dataset.sceneIndex = String(activeSceneIndex);

        if (activeSceneIndex <= 0) {
          applyHeroState(clamp(detail.progress));
          return;
        }

        if (activeSceneIndex === 1) {
          applyPitchState();
          return;
        }

        if (activeSceneIndex === 2) {
          applyBlockThreeState();
          return;
        }

        hideParticleLayer();
      };

      shell.addEventListener("desorden:hero-progress", handleHeroProgress);

      const handleResize = () => scheduleMeshSync();
      window.addEventListener("resize", handleResize, { passive: true });
      window.addEventListener("orientationchange", handleResize, { passive: true });
      window.visualViewport?.addEventListener("resize", handleResize, { passive: true });

      resizeObserver = new ResizeObserver(scheduleMeshSync);
      resizeObserver.observe(fallbackImage);
      resizeObserver.observe(wrapper);

      wrapper.dataset.webgl = "ready";
      wrapper.dataset.particleCount = String(PARTICLE_COUNT);
      scheduleMeshSync();

      const initialSceneIndex = getActiveSceneIndex();
      const initialProgress = Number.parseFloat(
        shell.style.getPropertyValue("--hero-particle-progress") || "0",
      );

      if (initialSceneIndex === 1) applyPitchState();
      else if (initialSceneIndex === 2) applyBlockThreeState();
      else if (initialSceneIndex > 2) hideParticleLayer();
      else applyHeroState(initialProgress, true);

      const startedAt = performance.now();
      const renderFrame = (now: number) => {
        if (destroyed || !renderer || !material) return;
        material.uniforms.uTime.value = (now - startedAt) / 1000;
        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(renderFrame);
      };

      animationFrame = window.requestAnimationFrame(renderFrame);

      abortController.signal.addEventListener(
        "abort",
        () => {
          shell.removeEventListener("desorden:hero-progress", handleHeroProgress);
          window.removeEventListener("resize", handleResize);
          window.removeEventListener("orientationchange", handleResize);
          window.visualViewport?.removeEventListener("resize", handleResize);
          resizeObserver?.disconnect();
        },
        { once: true },
      );
    };

    void initialize().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Unable to initialize hero particle portrait", error);
      wrapper.dataset.webgl = "fallback";
      wrapper.dataset.renderSource = "html";
      wrapper.dataset.particleMotion = "fallback";
      wrapper.style.setProperty("--hero-fallback-opacity", "1");
      wrapper.style.setProperty("--hero-canvas-opacity", "0");
    });

    return () => {
      destroyed = true;
      abortController.abort();
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(syncFrame);
      tweens.forEach((tween) => tween.kill());
      resizeObserver?.disconnect();
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      renderer?.dispose();
    };
  }, [hydrated, imageUrl]);

  const projectFile = imageUrl.replace(/^\/+/, "");

  return (
    <div
      ref={wrapperRef}
      className="hero-particle-portrait"
      data-webgl="loading"
      data-overlay="hero"
      data-render-source="html"
      data-particle-motion="idle"
      data-particle-count={PARTICLE_COUNT}
      aria-hidden="true"
    >
      <ProjectPicture
        file={projectFile}
        alt=""
        width={768}
        height={1028}
        className="hero-particle-portrait__fallback"
        sizes="(max-width: 760px) 113vw, 62vw"
        eager
      />
      <canvas
        ref={canvasRef}
        className="hero-particle-portrait__canvas"
        data-hero-particle-canvas
      />
      <span className="hero-particle-portrait__veil" />
    </div>
  );
}
