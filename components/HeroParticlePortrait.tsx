"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ProjectPicture } from "./ProjectPicture";

const MOBILE_BREAKPOINT = 768;
const MOBILE_SAMPLE_STEP = 6;
const DESKTOP_SAMPLE_STEP = 3;
const MOBILE_MAX_DPR = 1.5;
const DESKTOP_MAX_DPR = 2;
const MIN_ALPHA = 24;
const MIN_LUMINANCE = 14;
const subscribeToHydration = () => () => undefined;

type HeroProgressDetail = {
  progress: number;
  active: boolean;
  sceneIndex: number;
};

type HeroParticlePortraitProps = {
  imageUrl?: string;
};

type Particle = {
  originX: number;
  originY: number;
  velocityX: number;
  velocityY: number;
  depth: number;
  phase: number;
  speed: number;
  size: number;
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

type AnimationState = {
  disperse: number;
  depth: number;
  fade: number;
  targetDisperse: number;
  targetDepth: number;
  targetFade: number;
};

type BuildResult = {
  particles: Particle[];
  renderedWidth: number;
  renderedHeight: number;
  sourceAspect: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - clamp(value), 3);
}

function easeInCubic(value: number) {
  const clamped = clamp(value);
  return clamped * clamped * clamped;
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

function isMobileViewport() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getSampleStep() {
  return isMobileViewport() ? MOBILE_SAMPLE_STEP : DESKTOP_SAMPLE_STEP;
}

function getCanvasPixelRatio() {
  const maximum = isMobileViewport() ? MOBILE_MAX_DPR : DESKTOP_MAX_DPR;
  return Math.min(window.devicePixelRatio || 1, maximum);
}

function waitForRenderedImage(image: HTMLImageElement, signal: AbortSignal) {
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

/**
 * Carga una segunda copia de la imagen exclusivamente para leer sus píxeles.
 * crossOrigin debe asignarse antes de src para evitar un canvas contaminado.
 */
function loadReadableImage(source: string, signal: AbortSignal) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    const cleanup = () => {
      signal.removeEventListener("abort", handleAbort);
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };

    const handleAbort = () => {
      cleanup();
      image.src = "";
      reject(new DOMException("Image loading aborted", "AbortError"));
    };

    const finish = () => {
      if (signal.aborted) {
        handleAbort();
        return;
      }

      cleanup();
      void image.decode().catch(() => undefined).finally(() => resolve(image));
    };

    const handleLoad = () => finish();
    const handleError = () => {
      cleanup();
      reject(new Error(`The particle source cannot be read: ${source}`));
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });

    // Debe ser la última asignación: primero crossOrigin, después src.
    image.src = source;

    if (image.complete && image.naturalWidth > 0) {
      queueMicrotask(finish);
    }
  });
}

function resizeCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const pixelRatio = getCanvasPixelRatio();

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { width, height, pixelRatio };
}

function createParticles(
  readableImage: HTMLImageElement,
  imageRect: DOMRect,
  step: number,
): BuildResult {
  const renderedWidth = Math.max(1, Math.round(imageRect.width));
  const renderedHeight = Math.max(1, Math.round(imageRect.height));
  const samplingCanvas = document.createElement("canvas");
  samplingCanvas.width = renderedWidth;
  samplingCanvas.height = renderedHeight;

  const samplingContext = samplingCanvas.getContext("2d", {
    alpha: true,
    willReadFrequently: true,
  });

  if (!samplingContext) {
    throw new Error("Canvas 2D is unavailable");
  }

  samplingContext.clearRect(0, 0, renderedWidth, renderedHeight);
  samplingContext.drawImage(readableImage, 0, 0, renderedWidth, renderedHeight);

  let pixels: Uint8ClampedArray;

  try {
    pixels = samplingContext.getImageData(0, 0, renderedWidth, renderedHeight).data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "SecurityError") {
      throw new Error(
        "Tainted canvas: the image server must allow anonymous CORS requests.",
      );
    }
    throw error;
  }

  const particles: Particle[] = [];
  const random = createSeededRandom(20260806 + renderedWidth + renderedHeight + step);
  const mobile = isMobileViewport();
  const minimumTravel = mobile ? 42 : 58;
  const maximumTravel = mobile ? 138 : 210;
  const centerX = renderedWidth / 2;
  const centerY = renderedHeight / 2;

  for (let y = Math.floor(step / 2); y < renderedHeight; y += step) {
    for (let x = Math.floor(step / 2); x < renderedWidth; x += step) {
      const pixelIndex = (y * renderedWidth + x) * 4;
      const red = pixels[pixelIndex];
      const green = pixels[pixelIndex + 1];
      const blue = pixels[pixelIndex + 2];
      const alphaByte = pixels[pixelIndex + 3];
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;

      // El fondo negro no necesita partículas: ya coincide con el fondo de la web.
      if (alphaByte < MIN_ALPHA || luminance < MIN_LUMINANCE) continue;

      const normalizedX = (x - centerX) / Math.max(1, centerX);
      const normalizedY = (y - centerY) / Math.max(1, centerY);
      const radialAngle = Math.atan2(normalizedY, normalizedX);
      const angle = radialAngle + (random() - 0.5) * 1.45;
      const travel = minimumTravel + random() * (maximumTravel - minimumTravel);
      const verticalLift = (random() - 0.58) * (mobile ? 92 : 128);

      particles.push({
        originX: imageRect.left + x,
        originY: imageRect.top + y,
        velocityX: Math.cos(angle) * travel + normalizedX * travel * 0.42,
        velocityY: Math.sin(angle) * travel + verticalLift,
        depth: 0.35 + random() * 1.15,
        phase: random() * Math.PI * 2,
        speed: 0.55 + random() * 1.35,
        size: step * (0.9 + random() * 0.22),
        red,
        green,
        blue,
        alpha: alphaByte / 255,
      });
    }
  }

  return {
    particles,
    renderedWidth,
    renderedHeight,
    sourceAspect: readableImage.naturalWidth / Math.max(1, readableImage.naturalHeight),
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
    const shell = wrapper?.closest<HTMLElement>(".site-shell");
    const fallbackImage = wrapper?.querySelector<HTMLImageElement>(
      ".hero-particle-portrait__fallback img",
    );
    const context = canvas?.getContext("2d", { alpha: true });

    if (!wrapper || !canvas || !shell || !fallbackImage || !context) return;

    const abortController = new AbortController();
    const state: AnimationState = {
      disperse: 0,
      depth: 0,
      fade: 0,
      targetDisperse: 0,
      targetDepth: 0,
      targetFade: 0,
    };

    let particles: Particle[] = [];
    let animationFrame = 0;
    let rebuildFrame = 0;
    let buildVersion = 0;
    let resizeObserver: ResizeObserver | null = null;
    let destroyed = false;
    let viewport = resizeCanvas(canvas, context);

    const getActiveSceneIndex = () => {
      const scenes = Array.from(shell.querySelectorAll<HTMLElement>("[data-scene]"));
      return scenes.findIndex((scene) => scene.dataset.state === "current");
    };

    const setLayerMode = (mode: "html" | "canvas2d" | "hidden") => {
      wrapper.dataset.renderSource = mode;

      if (mode === "html") {
        wrapper.style.setProperty("--hero-layer-opacity", "1");
        wrapper.style.setProperty("--hero-fallback-opacity", "1");
        wrapper.style.setProperty("--hero-canvas-opacity", "0");
        return;
      }

      if (mode === "canvas2d") {
        wrapper.style.setProperty("--hero-layer-opacity", "1");
        wrapper.style.setProperty("--hero-fallback-opacity", "0");
        wrapper.style.setProperty("--hero-canvas-opacity", "1");
        return;
      }

      wrapper.style.setProperty("--hero-layer-opacity", "0");
      wrapper.style.setProperty("--hero-fallback-opacity", "0");
      wrapper.style.setProperty("--hero-canvas-opacity", "0");
    };

    const updateTargets = (sceneIndex: number, progress: number) => {
      wrapper.dataset.sceneIndex = String(sceneIndex);

      if (sceneIndex <= 0) {
        const disperse = clamp(progress / 0.5);
        const idle = progress <= 0.001;

        state.targetDisperse = disperse;
        state.targetDepth = 0;
        state.targetFade = 0;
        wrapper.dataset.overlay = "hero";
        wrapper.dataset.phase = idle ? "idle" : "hero-particles";
        wrapper.dataset.particleMotion = idle ? "idle" : "dispersing";
        wrapper.dataset.disperseTarget = disperse.toFixed(3);
        wrapper.dataset.depthTarget = "0.000";
        wrapper.dataset.fadeTarget = "0.000";
        wrapper.style.setProperty("--hero-veil-opacity", idle ? "1" : "0.12");
        setLayerMode(idle || particles.length === 0 ? "html" : "canvas2d");
        return;
      }

      if (sceneIndex === 1) {
        state.targetDisperse = 1;
        state.targetDepth = 0.16;
        state.targetFade = 0;
        wrapper.dataset.overlay = "pitch";
        wrapper.dataset.phase = "pitch-particles";
        wrapper.dataset.particleMotion = "over-pitch";
        wrapper.dataset.disperseTarget = "1.000";
        wrapper.dataset.depthTarget = "0.160";
        wrapper.dataset.fadeTarget = "0.000";
        wrapper.style.setProperty("--hero-veil-opacity", "0");
        setLayerMode(particles.length === 0 ? "html" : "canvas2d");
        return;
      }

      if (sceneIndex === 2) {
        state.targetDisperse = 1;
        state.targetDepth = 1;
        state.targetFade = 1;
        wrapper.dataset.overlay = "leaving";
        wrapper.dataset.phase = "block-3-fade";
        wrapper.dataset.particleMotion = "depth-fade";
        wrapper.dataset.disperseTarget = "1.000";
        wrapper.dataset.depthTarget = "1.000";
        wrapper.dataset.fadeTarget = "1.000";
        wrapper.style.setProperty("--hero-veil-opacity", "0");
        setLayerMode(particles.length === 0 ? "hidden" : "canvas2d");
        return;
      }

      state.targetDisperse = 1;
      state.targetDepth = 1;
      state.targetFade = 1;
      wrapper.dataset.overlay = "hidden";
      wrapper.dataset.phase = "hidden";
      wrapper.dataset.particleMotion = "hidden";
      setLayerMode("hidden");
    };

    const handleHeroProgress = (event: Event) => {
      const detail = (event as CustomEvent<HeroProgressDetail>).detail;
      if (!detail) return;
      updateTargets(getActiveSceneIndex(), clamp(detail.progress));
    };

    const rebuildParticles = async () => {
      const currentBuild = ++buildVersion;

      await waitForRenderedImage(fallbackImage, abortController.signal);
      if (destroyed || abortController.signal.aborted || currentBuild !== buildVersion) return;

      const imageRect = fallbackImage.getBoundingClientRect();
      if (imageRect.width <= 0 || imageRect.height <= 0) return;

      const source = fallbackImage.currentSrc || fallbackImage.src || imageUrl;
      const readableImage = await loadReadableImage(source, abortController.signal);
      if (destroyed || abortController.signal.aborted || currentBuild !== buildVersion) return;

      viewport = resizeCanvas(canvas, context);
      const step = getSampleStep();
      const result = createParticles(readableImage, imageRect, step);
      particles = result.particles;

      wrapper.dataset.renderer = "canvas2d";
      wrapper.dataset.rendererStatus = "ready";
      wrapper.dataset.particleStep = String(step);
      wrapper.dataset.particleCount = String(particles.length);
      wrapper.dataset.meshLeft = imageRect.left.toFixed(3);
      wrapper.dataset.meshTop = imageRect.top.toFixed(3);
      wrapper.dataset.meshWidth = imageRect.width.toFixed(3);
      wrapper.dataset.meshHeight = imageRect.height.toFixed(3);
      wrapper.dataset.textureAspect = result.sourceAspect.toFixed(6);
      wrapper.dataset.renderedAspect = (
        result.renderedWidth / Math.max(1, result.renderedHeight)
      ).toFixed(6);

      const initialProgress = Number.parseFloat(
        shell.style.getPropertyValue("--hero-particle-progress") || "0",
      );
      updateTargets(getActiveSceneIndex(), clamp(initialProgress));
    };

    const scheduleRebuild = () => {
      window.cancelAnimationFrame(rebuildFrame);
      rebuildFrame = window.requestAnimationFrame(() => {
        void rebuildParticles().catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Unable to build Canvas 2D hero particles", error);
          wrapper.dataset.rendererStatus = "fallback";
          wrapper.dataset.particleMotion = "fallback";
          setLayerMode("html");
        });
      });
    };

    const render = (timestamp: number) => {
      if (destroyed) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const smoothing = reducedMotion ? 1 : 0.095;
      state.disperse += (state.targetDisperse - state.disperse) * smoothing;
      state.depth += (state.targetDepth - state.depth) * smoothing;
      state.fade += (state.targetFade - state.fade) * smoothing;

      context.clearRect(0, 0, viewport.width, viewport.height);

      const shouldDraw =
        particles.length > 0 &&
        (state.disperse > 0.001 || state.targetDisperse > 0.001) &&
        state.fade < 0.999;

      if (shouldDraw) {
        const disperse = easeOutCubic(state.disperse);
        const depth = easeInCubic(state.depth);
        const fade = clamp(state.fade);
        const seconds = timestamp / 1000;
        const viewportCenterX = viewport.width / 2;
        const viewportCenterY = viewport.height / 2;

        context.globalCompositeOperation = "source-over";

        for (const particle of particles) {
          const flutterX = Math.cos(seconds * particle.speed + particle.phase);
          const flutterY = Math.sin(seconds * particle.speed * 0.82 + particle.phase);
          const depthExpansionX =
            (particle.originX - viewportCenterX) * depth * (0.5 + particle.depth * 0.72);
          const depthExpansionY =
            (particle.originY - viewportCenterY) * depth * (0.42 + particle.depth * 0.64);

          const x =
            particle.originX +
            particle.velocityX * disperse +
            flutterX * (4 + particle.depth * 9) * disperse +
            depthExpansionX;
          const y =
            particle.originY +
            particle.velocityY * disperse +
            flutterY * (3 + particle.depth * 8) * disperse +
            depthExpansionY;

          const size = Math.max(
            0.65,
            particle.size *
              (1 - disperse * 0.62) *
              (1 + depth * (0.75 + particle.depth * 1.25)),
          );
          const alpha = particle.alpha * (1 - fade);

          if (alpha <= 0.003) continue;

          context.globalAlpha = alpha;
          context.fillStyle = `rgb(${particle.red} ${particle.green} ${particle.blue})`;
          context.fillRect(x - size / 2, y - size / 2, size, size);
        }

        context.globalAlpha = 1;
      }

      if (state.fade > 0.985 && state.targetFade >= 1) {
        wrapper.dataset.phase = "hidden";
        wrapper.dataset.particleMotion = "hidden";
        setLayerMode("hidden");
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    shell.addEventListener("desorden:hero-progress", handleHeroProgress);
    window.addEventListener("resize", scheduleRebuild, { passive: true });
    window.addEventListener("orientationchange", scheduleRebuild, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleRebuild, { passive: true });

    resizeObserver = new ResizeObserver(scheduleRebuild);
    resizeObserver.observe(fallbackImage);
    resizeObserver.observe(wrapper);

    wrapper.dataset.renderer = "canvas2d";
    wrapper.dataset.rendererStatus = "loading";
    wrapper.dataset.particleCount = "0";
    wrapper.dataset.particleStep = String(getSampleStep());
    setLayerMode("html");
    scheduleRebuild();
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      destroyed = true;
      buildVersion += 1;
      abortController.abort();
      shell.removeEventListener("desorden:hero-progress", handleHeroProgress);
      window.removeEventListener("resize", scheduleRebuild);
      window.removeEventListener("orientationchange", scheduleRebuild);
      window.visualViewport?.removeEventListener("resize", scheduleRebuild);
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(rebuildFrame);
      particles = [];
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [hydrated, imageUrl]);

  const projectFile = imageUrl.replace(/^\/+/, "");

  return (
    <div
      ref={wrapperRef}
      className="hero-particle-portrait"
      data-renderer="canvas2d"
      data-renderer-status="loading"
      data-overlay="hero"
      data-render-source="html"
      data-particle-motion="idle"
      data-particle-count="0"
      data-particle-step={MOBILE_SAMPLE_STEP}
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
