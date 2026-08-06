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
    float acceleratedDepth = pow(phaseTwo, 1.65);

    // En uDisperse = 0.0 la posición coincide exactamente con la cuadrícula UV.
    vec3 transformed = position;

    float flutter = sin((uTime * 0.9) + (aSeed * 31.4159)) * 0.055 * phaseOne;
    transformed += aScatter * phaseOne;
    transformed.xy += vec2(
      cos((aSeed * 41.0) + uTime),
      sin((aSeed * 29.0) + uTime * 0.82)
    ) * flutter;

    // Segunda fase: el polvo acelera hacia cámara y se abre lateralmente.
    transformed.z += aDepth * acceleratedDepth * 6.35;
    transformed.xy += aScatter.xy * acceleratedDepth * 1.65;

    vec4 modelPosition = modelViewMatrix * vec4(transformed, 1.0);
    float perspective = clamp(7.2 / max(0.72, -modelPosition.z), 0.82, 7.5);
    float solidCoverage = mix(1.24, 0.82, phaseOne);
    float depthExpansion = 1.0 + acceleratedDepth * 1.45;

    // El multiplicador inicial solapa las celdas para que no existan huecos negros.
    gl_PointSize = uPointSize * perspective * solidCoverage * depthExpansion;
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
    // Cada Point cubre su celda completa de la textura, no un único color plano.
    vec2 cellOffset = vec2(
      (gl_PointCoord.x - 0.5) / ${GRID_WIDTH.toFixed(1)},
      (gl_PointCoord.y - 0.5) / ${GRID_HEIGHT.toFixed(1)}
    );
    vec2 sampleUv = clamp(vUv + cellOffset, vec2(0.0), vec2(1.0));
    vec4 sampledColor = texture2D(uTexture, sampleUv);

    // Fotografía sólida al inicio; círculo suave únicamente al comenzar la dispersión.
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float roundMask = smoothstep(0.52, 0.12, distanceToCenter);
    float particleMask = mix(1.0, roundMask, smoothstep(0.02, 0.22, vDisperse));

    // Los píxeles negros conservan la foto inicial, pero no ensucian la nube de polvo.
    float luminance = dot(sampledColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    float dustVisibility = mix(1.0, smoothstep(0.025, 0.42, luminance), vDisperse);
    float alpha = sampledColor.a * particleMask * dustVisibility * (1.0 - vFade);

    if (alpha < 0.003) discard;

    // En scroll 0 equivale visualmente a gl_FragColor = texture2D(uTexture, vUv).
    gl_FragColor = vec4(sampledColor.rgb, alpha);
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
  frustumCulled: boolean;
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

type ScrollTriggerInstanceLike = { kill(): void };
type ScrollTriggerLike = {
  create(options: Record<string, unknown>): ScrollTriggerInstanceLike;
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

function createPortraitGrid(image: HTMLImageElement, isMobile: boolean) {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const uvs = new Float32Array(PARTICLE_COUNT * 2);
  const scatters = new Float32Array(PARTICLE_COUNT * 3);
  const depths = new Float32Array(PARTICLE_COUNT);
  const seeds = new Float32Array(PARTICLE_COUNT);
  const random = createSeededRandom(20260806);
  const portraitHeight = isMobile ? 6.55 : 6.85;
  const portraitWidth = portraitHeight * (image.naturalWidth / image.naturalHeight);

  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const index = y * GRID_WIDTH + x;
      const positionOffset = index * 3;
      const uvOffset = index * 2;
      const u = (x + 0.5) / GRID_WIDTH;
      const v = 1 - (y + 0.5) / GRID_HEIGHT;
      const seed = random();
      const angle = random() * Math.PI * 2;
      const radius = 0.22 + random() * 1.72;
      const verticalDrift = (random() - 0.5) * 1.8;

      positions[positionOffset] = (u - 0.5) * portraitWidth;
      positions[positionOffset + 1] = (v - 0.5) * portraitHeight;
      positions[positionOffset + 2] = 0;

      uvs[uvOffset] = u;
      uvs[uvOffset + 1] = v;

      scatters[positionOffset] = Math.cos(angle) * radius;
      scatters[positionOffset + 1] = Math.sin(angle) * radius + verticalDrift;
      scatters[positionOffset + 2] = (random() - 0.5) * 1.45;

      depths[index] = 0.38 + random() * 0.72;
      seeds[index] = seed;
    }
  }

  return { positions, uvs, scatters, depths, seeds };
}

function getRendererPixelRatio(isMobile: boolean) {
  return Math.min(window.devicePixelRatio, isMobile ? 1.5 : 1.8);
}

function getPointSize(image: HTMLImageElement, isMobile: boolean) {
  const aspect = image.naturalWidth / image.naturalHeight;
  const portraitWidthCss = isMobile
    ? window.innerWidth * 1.13
    : Math.min(window.innerWidth * 0.62, 860);
  const portraitHeightCss = portraitWidthCss / aspect;
  const cellSizeCss = Math.max(
    portraitWidthCss / GRID_WIDTH,
    portraitHeightCss / GRID_HEIGHT,
  );

  return Math.max(2.4, cellSizeCss * getRendererPixelRatio(isMobile) * 1.12);
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

    if (!wrapper || !canvas || !hero) return;

    const abortController = new AbortController();
    const tweens = new Set<TweenLike>();
    let scrollTriggerInstance: ScrollTriggerInstanceLike | null = null;
    let geometry: BufferGeometryLike | null = null;
    let material: MaterialLike | null = null;
    let texture: TextureLike | null = null;
    let renderer: RendererLike | null = null;
    let animationFrame = 0;
    let destroyed = false;

    const initialize = async () => {
      await Promise.all([
        loadScript(THREE_VENDOR, () => Boolean(window.THREE)),
        loadScript(GSAP_VENDOR, () => Boolean(window.gsap)),
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

      const image = await loadImage(imageUrl, abortController.signal);
      if (abortController.signal.aborted || destroyed) return;

      const isMobile = window.matchMedia("(max-width: 760px)").matches;
      const portraitGrid = createPortraitGrid(image, isMobile);
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
      renderer.setPixelRatio(getRendererPixelRatio(isMobile));
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      texture = new THREE.Texture(image);
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
        uPointSize: { value: getPointSize(image, isMobile) },
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
      particles.position.set(isMobile ? 0.78 : 2.05, isMobile ? 0.74 : 0.15, 0);
      particles.scale.setScalar(isMobile ? 1.15 : 1.22);
      particles.frustumCulled = false;
      scene.add(particles);

      const heroCopy = hero.querySelector<HTMLElement>(".intro-heading");

      const addTween = (tween: TweenLike) => {
        tweens.add(tween);
        return tween;
      };

      const setLayerVariables = (progress: number) => {
        const fallbackOpacity = 1 - clamp(progress / 0.14);
        const veilOpacity = 1 - clamp((progress - 0.48) / 0.52);
        wrapper.style.setProperty("--hero-fallback-opacity", String(fallbackOpacity));
        wrapper.style.setProperty("--hero-veil-opacity", String(veilOpacity));
      };

      const applyProgress = (rawProgress: number, immediate = false) => {
        const progress = clamp(rawProgress);
        const phaseOne = clamp(progress * 2);
        const phaseTwo = clamp((progress - 0.5) * 2);
        const duration = immediate ? 0 : 0.48;

        hero.style.setProperty("--hero-particle-progress", String(progress));
        setLayerVariables(progress);

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
          value: phaseTwo,
          duration,
          ease: "power2.inOut",
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

      const completeHandoffOverPitch = () => {
        wrapper.dataset.overlay = "pitch";
        wrapper.style.setProperty("--hero-layer-opacity", "1");
        wrapper.style.setProperty("--hero-fallback-opacity", "0");
        wrapper.style.setProperty("--hero-veil-opacity", "0");

        addTween(gsap.to(uniforms.uDisperse, {
          value: 1,
          duration: 0.55,
          ease: "power2.out",
          overwrite: true,
        }));
        addTween(gsap.to(uniforms.uDepth, {
          value: 1,
          duration: 1.45,
          delay: 0.12,
          ease: "power3.in",
          overwrite: true,
        }));
        addTween(gsap.to(uniforms.uFade, {
          value: 1,
          duration: 1.55,
          delay: 0.18,
          ease: "power2.inOut",
          overwrite: true,
        }));
      };

      const handleHeroProgress = (event: Event) => {
        const detail = (event as CustomEvent<HeroProgressDetail>).detail;
        if (!detail) return;

        wrapper.dataset.sceneIndex = String(detail.sceneIndex);

        if (detail.sceneIndex === 0) {
          wrapper.dataset.overlay = "hero";
          wrapper.style.setProperty("--hero-layer-opacity", "1");
          applyProgress(detail.progress);
          return;
        }

        if (detail.sceneIndex === 1) {
          applyProgress(Math.max(detail.progress, HERO_HANDOFF_PROGRESS));
          completeHandoffOverPitch();
          return;
        }

        wrapper.dataset.overlay = "hidden";
        wrapper.style.setProperty("--hero-layer-opacity", "0");
        applyProgress(1, true);
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
        if (!renderer || !material) return;
        const mobileNow = window.innerWidth <= 760;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(getRendererPixelRatio(mobileNow));
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        material.uniforms.uPointSize.value = getPointSize(image, mobileNow);
        ScrollTrigger.refresh();
      };

      window.addEventListener("resize", handleResize, { passive: true });
      wrapper.dataset.webgl = "ready";
      wrapper.dataset.particleCount = String(PARTICLE_COUNT);
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
      texture?.dispose();
      renderer?.dispose();
    };
  }, [hydrated, imageUrl]);

  return (
    <div
      ref={wrapperRef}
      className="hero-particle-portrait"
      data-webgl="loading"
      data-overlay="hero"
      aria-hidden="true"
    >
      <ProjectPicture
        file="media/hero/portada-chico-bn.webp"
        alt=""
        width={768}
        height={1028}
        className="hero-particle-portrait__fallback"
        sizes="(max-width: 760px) 113vw, 62vw"
        eager
      />
      <canvas ref={canvasRef} className="hero-particle-portrait__canvas" data-hero-particle-canvas />
      <span className="hero-particle-portrait__veil" />
    </div>
  );
}
