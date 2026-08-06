(() => {
  "use strict";

  const root = document.querySelector("[data-experience]");
  const scenes = Array.from(document.querySelectorAll("[data-scene]"));
  const counter = document.querySelector("[data-counter]");
  const label = document.querySelector("[data-label]");
  const progressBar = document.querySelector("[data-progress]");
  const progressRail = progressBar?.parentElement;
  const live = document.querySelector("[data-live]");
  const hint = document.querySelector("[data-hint]");

  if (!root || scenes.length === 0) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const maxProgress = scenes.length - 1;

  const state = {
    current: 0,
    target: 0,
    velocity: 0,
    dragging: false,
    lastY: 0,
    lastTime: 0,
    lastInputAt: performance.now(),
    snapTimer: 0,
    announcedIndex: 0,
    started: false,
  };

  const settings = {
    zGap: 1380,
    wheelSensitivity: 0.00125,
    touchSensitivity: 0.0031,
    easing: 0.068,
    maxVisibleDistance: 2.35,
    snapDelay: 520,
    nearZ: 280,
    farZ: -3000,
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smoothstep = (edge0, edge1, value) => {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function scheduleSnap(delay = settings.snapDelay) {
    window.clearTimeout(state.snapTimer);
    state.snapTimer = window.setTimeout(() => {
      if (state.dragging) return;
      state.target = clamp(Math.round(state.target), 0, maxProgress);
    }, delay);
  }

  function markStarted() {
    if (state.started) return;
    state.started = true;
    hint?.classList.add("is-hidden");
  }

  function addProgress(delta) {
    markStarted();
    state.lastInputAt = performance.now();
    state.target = clamp(state.target + delta, 0, maxProgress);
    scheduleSnap();
  }

  function onWheel(event) {
    if (Math.abs(event.deltaY) < 1) return;
    event.preventDefault();
    const normalized = clamp(event.deltaY, -140, 140);
    addProgress(normalized * settings.wheelSensitivity);
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    state.dragging = true;
    state.lastY = event.clientY;
    state.lastTime = performance.now();
    state.velocity = 0;
    root.setPointerCapture?.(event.pointerId);
    window.clearTimeout(state.snapTimer);
    markStarted();
  }

  function onPointerMove(event) {
    if (!state.dragging) return;
    event.preventDefault();

    const now = performance.now();
    const deltaY = state.lastY - event.clientY;
    const dt = Math.max(8, now - state.lastTime);
    const progressDelta = deltaY * settings.touchSensitivity;

    state.target = clamp(state.target + progressDelta, 0, maxProgress);
    state.velocity = progressDelta / dt;
    state.lastY = event.clientY;
    state.lastTime = now;
  }

  function endPointer(event) {
    if (!state.dragging) return;
    state.dragging = false;
    root.releasePointerCapture?.(event.pointerId);

    const inertia = clamp(state.velocity * 160, -0.28, 0.28);
    state.target = clamp(state.target + inertia, 0, maxProgress);
    scheduleSnap(340);
  }

  function onKeyDown(event) {
    const forward = ["ArrowDown", "PageDown", " "];
    const backward = ["ArrowUp", "PageUp"];

    if (forward.includes(event.key)) {
      event.preventDefault();
      state.target = clamp(Math.floor(state.target + 1.001), 0, maxProgress);
      markStarted();
    } else if (backward.includes(event.key)) {
      event.preventDefault();
      state.target = clamp(Math.ceil(state.target - 1.001), 0, maxProgress);
      markStarted();
    } else if (event.key === "Home") {
      event.preventDefault();
      state.target = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      state.target = maxProgress;
    }
  }

  function updateFixedUI(progress) {
    const nearest = clamp(Math.round(progress), 0, maxProgress);
    const activeScene = scenes[nearest];
    const sceneLabel = activeScene?.dataset.label ?? "secció";

    if (counter) counter.textContent = `${String(nearest + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
    if (label) label.textContent = sceneLabel;

    if (progressBar && progressRail) {
      const travel = Math.max(0, progressRail.clientHeight - progressBar.offsetHeight);
      progressBar.style.transform = `translate3d(0, ${Math.round((progress / maxProgress) * travel)}px, 0)`;
    }

    if (nearest !== state.announcedIndex) {
      state.announcedIndex = nearest;
      if (live) live.textContent = `Secció ${nearest + 1} de ${scenes.length}: ${sceneLabel}`;
    }
  }

  function renderScene(scene, index, progress) {
    const distance = index - progress;
    const absoluteDistance = Math.abs(distance);
    const visible = absoluteDistance <= settings.maxVisibleDistance;

    if (!visible) {
      scene.style.visibility = "hidden";
      scene.style.opacity = "0";
      scene.classList.remove("is-interactive");
      scene.setAttribute("aria-hidden", "true");
      scene.inert = true;
      return;
    }

    const z = clamp(-distance * settings.zGap, settings.farZ, settings.nearZ);
    const x = Math.sin(distance * 0.9) * 2.6;
    const y = distance * 4.2;
    const rotationX = clamp(distance * -2.35, -5.5, 5.5);
    const rotationY = clamp(distance * 1.25, -3.2, 3.2);
    const scale = clamp(1 - smoothstep(0, 1.9, absoluteDistance) * 0.16 + (distance < 0 ? 0.016 : 0), 0.84, 1.02);
    const opacityBase = 1 - smoothstep(0.12, 2.02, absoluteDistance);
    const forwardFade = distance < 0 ? 1 - smoothstep(0.16, 0.92, -distance) : 1;
    const opacity = clamp(opacityBase * forwardFade, 0, 1);
    const interactive = absoluteDistance < 0.42;

    scene.style.visibility = "visible";
    scene.style.opacity = String(opacity);
    scene.style.transform = `translate3d(${x}vw, ${y}vh, ${z}px) rotateX(${rotationX}deg) rotateY(${rotationY}deg) scale(${scale})`;
    scene.classList.toggle("is-interactive", interactive);
    scene.setAttribute("aria-hidden", String(!interactive));
    scene.inert = !interactive;

    const localProgress = clamp(1 - absoluteDistance, 0, 1);
    const direction = distance >= 0 ? 1 : -1;

    scene.querySelectorAll("[data-depth]").forEach((layer) => {
      const depth = Number(layer.dataset.depth || 0);
      const parallaxX = depth * distance * 0.0034;
      const parallaxY = depth * distance * -0.0052;
      const baseLocalZ = depth * (0.82 + localProgress * 0.22);
      const breathing = direction * (1 - localProgress) * Math.min(Math.abs(depth) * 0.16, 28);
      layer.style.transform = `translate3d(${parallaxX}px, ${parallaxY}px, ${baseLocalZ + breathing}px)`;
    });
  }

  function frame() {
    const reduced = prefersReducedMotion.matches;
    const factor = reduced ? 1 : settings.easing;
    state.current += (state.target - state.current) * factor;

    if (Math.abs(state.target - state.current) < 0.0001) state.current = state.target;

    scenes.forEach((scene, index) => renderScene(scene, index, state.current));
    updateFixedUI(state.current);
    requestAnimationFrame(frame);
  }

  root.addEventListener("wheel", onWheel, { passive: false });
  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("pointermove", onPointerMove, { passive: false });
  root.addEventListener("pointerup", endPointer, { passive: true });
  root.addEventListener("pointercancel", endPointer, { passive: true });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", () => updateFixedUI(state.current), { passive: true });

  frame();
})();
