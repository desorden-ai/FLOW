const iterations = 100000;

const logos = Array.from({ length: 50 }, (_, i) => {
  return {
    get dataset() {
      return { z: String(-100 * i) };
    },
    style: {}
  };
});

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

const INTRO_END = 0.15;
const TOTAL_Z_TRAVEL = 12000;

function renderBaseline(logos, progress) {
  const safeProgress = clamp(progress);
  const logosEnabled = safeProgress > INTRO_END;
  const logoProgress = clamp((safeProgress - INTRO_END) / (1 - INTRO_END));
  const currentZAdvance = logoProgress * TOTAL_Z_TRAVEL;

  for (let i = 0; i < logos.length; i++) {
    const logo = logos[i];
    const initialZ = Number(logo.dataset.z ?? 0);
    const newZ = initialZ + currentZAdvance;

    logo.style.transform = `translate(-50%, -50%) translate3d(0, 0, ${newZ}px)`;

    let opacity = 0;
    if (logosEnabled && newZ > -3000 && newZ <= 0) {
      if (newZ < -1500) {
        opacity = (newZ + 3000) / 1500;
      } else if (newZ <= -800) {
        opacity = 1;
      } else {
        opacity = Math.abs(newZ) / 800;
      }
    }
    logo.style.opacity = String(clamp(opacity));
  }
}

const logosData = logos.map(logo => ({
  element: logo,
  initialZ: Number(logo.dataset.z ?? 0)
}));

function renderOptimized(logosData, progress) {
  const safeProgress = clamp(progress);
  const logosEnabled = safeProgress > INTRO_END;
  const logoProgress = clamp((safeProgress - INTRO_END) / (1 - INTRO_END));
  const currentZAdvance = logoProgress * TOTAL_Z_TRAVEL;

  for (let i = 0; i < logosData.length; i++) {
    const { element: logo, initialZ } = logosData[i];
    const newZ = initialZ + currentZAdvance;

    logo.style.transform = `translate(-50%, -50%) translate3d(0, 0, ${newZ}px)`;

    let opacity = 0;
    if (logosEnabled && newZ > -3000 && newZ <= 0) {
      if (newZ < -1500) {
        opacity = (newZ + 3000) / 1500;
      } else if (newZ <= -800) {
        opacity = 1;
      } else {
        opacity = Math.abs(newZ) / 800;
      }
    }
    logo.style.opacity = String(clamp(opacity));
  }
}

console.time("Baseline");
for (let i = 0; i < iterations; i++) {
  renderBaseline(logos, (i % 100) / 100);
}
console.timeEnd("Baseline");

console.time("Optimized");
for (let i = 0; i < iterations; i++) {
  renderOptimized(logosData, (i % 100) / 100);
}
console.timeEnd("Optimized");
