"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ProjectPicture } from "./ProjectPicture";

const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js";
const GSAP_CDN = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js";
const SCROLL_TRIGGER_CDN = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js";
const subscribeToHydration = () => () => undefined;

const vertexShader = `
  attribute vec3 aScatter;
  attribute float aDepth;
  attribute float aSeed;
  attribute float aLuma;

  uniform float uDisperse;
  uniform float uDepth;
  uniform float uPointSize;
  uniform float uTime;

  varying float vLuma;
  varying float vParticleAlpha;

  void main() {
    float phaseOne = smoothstep(0.0, 1.0, uDisperse);
    float phaseTwo = smoothstep(0.0, 1.0, uDepth);
    float flutter = sin((uTime * 0.85) + (aSeed * 31.4159)) * 0.045 * phaseOne;

    vec3 transformed = position;
    transformed += aScatter * phaseOne;
    transformed.xy += vec2(
      cos((aSeed * 41.0) + uTime),
      sin((aSeed * 29.0) + uTime * 0.8)
    ) * flutter;

    transformed.z += aDepth * phaseTwo * 5.8;
    transformed.xy += aScatter.xy * phaseTwo * 1.45;

    vec4 modelPosition = modelViewMatrix * vec4(transformed, 1.0);
    float perspective = clamp(2.9 / max(0.55, -modelPosition.z), 0.42, 3.1);

    gl_PointSize = uPointSize * perspective * (1.0 + phaseTwo * 0.8);
    gl_Position = projectionMatrix * modelPosition;

    vLuma = aLuma;
    vParticleAlpha = 1.0 - phaseTwo * 0.28;
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uFade;

  varying float vLuma;
  varying float vParticleAlpha;

  void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float softCircle = smoothstep(0.5, 0.08, distanceToCenter);
    vec3 particleColor = mix(vec3(0.38), vec3(1.0), vLuma);
    float alpha = softCircle * uFade * vParticleAlpha;

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(particleColor, alpha);
  }
`;

type UniformNumber = { value: number };
type UniformMap = {
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
  setScalar(value: number): void;
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
};

type SceneLike = {
  add(object: unknown): void;
};

type CameraLike = {
  aspect: number;
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
  Points: new (geometry: BufferGeometryLike, material: MaterialLike) => PointsLike;
  AdditiveBlending: unknown;
};

type TweenLike = { kill(): void };
type GsapLike = {
  registerPlugin(plugin: unknown): void;
  to(target: object, variables: Record<string, unknown>): TweenLike;
};

type ScrollTriggerInstanceLike = { kill(): void };
type ScrollTriggerLike = {
  create(options: Record<string, unknown>): ScrollTriggerInstanceLike;
  refresh(): void;
};

type HeroProgressDetail = {
  progress: number;
  active: boolean;
};

type HeroParticlePortraitProps = {
  imageUrl?: string;
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
    script.crossOrigin = "anonymous";
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

function loadImage(source: string, signal: AbortSignal) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";

    const handleAbort = () => {
      image.src = "";
      reject(new DOMException("Image loading aborted", "AbortError"));
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    image.addEventListener(
      "load",
      () => {
        signal.removeEventListener("abort", handleAbort);
        resolve(image);
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        signal.removeEventListener("abort", handleAbort);
        reject(new Error(`Unable to load hero image: ${source}`));
      },
      { once: true },
    );
    image.src = source;
  });
}

function samplePortrait(image: HTMLImageElement, isMobile: boolean) {
  const sampleWidth = isMobile ? 154 : 210;
  const sampleHeight = Math.max(
    1,
    Math.round(sampleWidth * (image.naturalHeight / image.naturalWidth)),
  );
  const offscreenCanvas = document.createElement("canvas");
  const context = offscreenCanvas.getContext("2d", { willReadFrequently: true });

  if (!context) throw new Error("Canvas 2D is unavailable");

  offscreenCanvas.width = sampleWidth;
  offscreenCanvas.height = sampleHeight;
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

  const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const positions: number[] = [];
  const scatters: number[] = [];
  const depths: number[] = [];
  const seeds: number[] = [];
  const luminances: number[] = [];
  const random = createSeededRandom(20260806);
  const portraitHeight = isMobile ? 6.4 : 6.8;
  const portraitWidth = portraitHeight * (sampleWidth / sampleHeight);

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const pixelIndex = (y * sampleWidth + x) * 4;
      const alpha = pixels[pixelIndex + 3] / 255;
      const red = pixels[pixelIndex] / 255;
      const green = pixels[pixelIndex + 1] / 255;
      const blue = pixels[pixelIndex + 2] / 255;
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;

      if (alpha < 0.08 || luminance < 0.018) continue;

      const keepProbability = clamp(0.16 + luminance * 1.35, 0.16, 0.96);
      if (random() > keepProbability) continue;

      const normalizedX = x / Math.max(1, sampleWidth - 1) - 0.5;
      const normalizedY = 0.5 - y / Math.max(1, sampleHeight - 1);
      const seed = random();
      const angle = random() * Math.PI * 2;
      const radius = 0.18 + random() * (1.1 + (1 - luminance) * 1.1);
      const verticalBias = (random() - 0.5) * 1.9;

      positions.push(
        normalizedX * portraitWidth,
        normalizedY * portraitHeight,
        (luminance - 0.45) * 0.16,
      );
      scatters.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius + verticalBias,
        (random() - 0.5) * 1.3,
      );
      depths.push(0.35 + random() * 0.68);
      seeds.push(seed);
      luminances.push(clamp(luminance * 1.3, 0.12, 1));
    }
  }

  return {
    positions: new Float32Array(positions),
    scatters: new Float32Array(scatters),
    depths: new Float32Array(depths),
    seeds: new Float32Array(seeds),
    luminances: new Float32Array(luminances),
  };
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
    const hero = wrapper?.closest<HTMLElement>("[data-scene]");
    const shell = wrapper?.closest<HTMLElement>(".site-shell");

    if (!wrapper || !canvas || !hero) return;

    const abortController = new AbortController();
    const tweens = new Set<TweenLike>();
    let scrollTriggerInstance: ScrollTriggerInstanceLike | null = null;
    let geometry: BufferGeometryLike | null = null;
    let material: MaterialLike | null = null;
    let renderer: RendererLike | null = null;
    let animationFrame = 0;
    let destroyed = false;

    const initialize = async () => {
      await Promise.all([
        loadScript(THREE_CDN, () => Boolean(window.THREE)),
        loadScript(GSAP_CDN, () => Boolean(window.gsap)),
      ]);
      await loadScript(SCROLL_TRIGGER_CDN, () => Boolean(window.ScrollTrigger));

      if (abortController.signal.aborted || destroyed) return;

      const THREE = window.THREE;
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;

      if (!THREE || !gsap || !ScrollTrigger) {
        throw new Error("WebGL animation libraries are unavailable");
      }

      gsap.registerPlugin(ScrollTrigger);

      const image = await loadImage(imageUrl, abortController.signal);
      if (abortController.signal.aborted || destroyed) return;

      const isMobile = window.matchMedia("(max-width: 760px)").matches;
      const sampledPortrait = samplePortrait(image, isMobile);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        isMobile ? 42 : 38,
        window.innerWidth / window.innerHeight,
        0.1,
        100,
      );
      camera.position.set(0, 0, 7.2);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.45 : 1.8));
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(sampledPortrait.positions, 3),
      );
      geometry.setAttribute(
        "aScatter",
        new THREE.Float32BufferAttribute(sampledPortrait.scatters, 3),
      );
      geometry.setAttribute(
        "aDepth",
        new THREE.Float32BufferAttribute(sampledPortrait.depths, 1),
      );
      geometry.setAttribute(
        "aSeed",
        new THREE.Float32BufferAttribute(sampledPortrait.seeds, 1),
      );
      geometry.setAttribute(
        "aLuma",
        new THREE.Float32BufferAttribute(sampledPortrait.luminances, 1),
      );

      const uniforms: UniformMap = {
        uDisperse: { value: 0 },
        uDepth: { value: 0 },
        uFade: { value: 1 },
        uPointSize: { value: isMobile ? 4.3 : 4.8 },
        uTime: { value: 0 },
      };

      material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const particles = new THREE.Points(geometry, material);
      particles.position.set(isMobile ? 0.78 : 2.05, isMobile ? 0.74 : 0.15, 0);
      particles.scale.setScalar(isMobile ? 1.15 : 1.22);
      scene.add(particles);

      const heroCopy = hero.querySelector<HTMLElement>(".intro-heading");

      const addTween = (tween: TweenLike) => {
        tweens.add(tween);
        return tween;
      };

      const applyProgress = (rawProgress: number, immediate = false) => {
        const progress = clamp(rawProgress);
        const phaseOne = clamp(progress * 2);
        const phaseTwo = clamp((progress - 0.5) * 2);
        const duration = immediate ? 0 : 0.62;

        hero.style.setProperty("--hero-particle-progress", String(progress));

        addTween(gsap.to(uniforms.uDisperse, {
          value: phaseOne,
          duration,
          ease: "power3.out",
          overwrite: true,
        }));
        addTween(gsap.to(uniforms.uDepth, {
          value: phaseTwo,
          duration,
          ease: "power2.inOut",
          overwrite: true,
        }));
        addTween(gsap.to(uniforms.uFade, {
          value: 1 - phaseTwo,
          duration,
          ease: "power2.out",
          overwrite: true,
        }));

        if (heroCopy) {
          addTween(gsap.to(heroCopy, {
            opacity: 1 - phaseTwo,
            y: phaseTwo * -28,
            duration,
            ease: "power2.out",
            overwrite: true,
          }));
        }
      };

      const handleHeroProgress = (event: Event) => {
        const detail = (event as CustomEvent<HeroProgressDetail>).detail;
        if (!detail) return;
        applyProgress(detail.progress);
      };

      shell?.addEventListener("desorden:hero-progress", handleHeroProgress);

      if (!shell) {
        scrollTriggerInstance = ScrollTrigger.create({
          trigger: hero,
          start: "top top",
          end: "+=200%",
          scrub: 0.65,
          onUpdate: (self: unknown) => {
            const progress = (self as { progress?: number }).progress ?? 0;
            applyProgress(progress);
          },
        });
      }

      const handleResize = () => {
        if (!renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth <= 760 ? 1.45 : 1.8));
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        ScrollTrigger.refresh();
      };

      window.addEventListener("resize", handleResize, { passive: true });
      wrapper.dataset.webgl = "ready";
      applyProgress(Number.parseFloat(shell?.style.getPropertyValue("--hero-particle-progress") || "0"), true);

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
          shell?.removeEventListener("desorden:hero-progress", handleHeroProgress);
          window.removeEventListener("resize", handleResize);
        },
        { once: true },
      );
    };

    void initialize().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Unable to initialize hero particle portrait", error);
      wrapper.dataset.webgl = "fallback";
    });

    return () => {
      destroyed = true;
      abortController.abort();
      window.cancelAnimationFrame(animationFrame);
      scrollTriggerInstance?.kill();
      tweens.forEach((tween) => tween.kill());
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
    };
  }, [hydrated, imageUrl]);

  return (
    <div ref={wrapperRef} className="hero-particle-portrait" data-webgl="loading" aria-hidden="true">
      <ProjectPicture
        file="media/hero/portada-chico-bn.webp"
        alt=""
        width={768}
        height={1028}
        className="hero-particle-portrait__fallback"
        sizes="(max-width: 760px) 112vw, 62vw"
        eager
      />
      <canvas ref={canvasRef} className="hero-particle-portrait__canvas" data-hero-particle-canvas />
      <span className="hero-particle-portrait__veil" />
    </div>
  );
}
