import { readFile, readdir } from "node:fs/promises";

const files = await readdir(process.cwd());
const reportFile = files.find((file) => /^lighthouse-report.*\.json$/.test(file));

if (!reportFile) {
  throw new Error("Lighthouse JSON report was not generated.");
}

const report = JSON.parse(await readFile(reportFile, "utf8"));

// Defaults preserve the last approved mobile baseline while blocking measurable regressions.
const categoryBudgets = {
  performance: Number(process.env.LH_MIN_PERFORMANCE ?? 0.75),
  accessibility: Number(process.env.LH_MIN_ACCESSIBILITY ?? 0.95),
  "best-practices": Number(process.env.LH_MIN_BEST_PRACTICES ?? 0.95),
  seo: Number(process.env.LH_MIN_SEO ?? 0.95),
};

const metricBudgets = {
  "largest-contentful-paint": Number(process.env.LH_MAX_LCP_MS ?? 3_000),
  "cumulative-layout-shift": Number(process.env.LH_MAX_CLS ?? 0.1),
  "total-blocking-time": Number(process.env.LH_MAX_TBT_MS ?? 900),
};

const failures = [];

for (const [category, minimum] of Object.entries(categoryBudgets)) {
  const score = report.categories?.[category]?.score;
  if (typeof score !== "number") {
    failures.push(`${category}: missing score`);
    continue;
  }

  console.log(`${category}: ${Math.round(score * 100)} (minimum ${Math.round(minimum * 100)})`);
  if (score < minimum) failures.push(`${category}: ${score.toFixed(2)} < ${minimum.toFixed(2)}`);
}

for (const [audit, maximum] of Object.entries(metricBudgets)) {
  const value = report.audits?.[audit]?.numericValue;
  if (typeof value !== "number") {
    failures.push(`${audit}: missing numeric value`);
    continue;
  }

  console.log(`${audit}: ${value.toFixed(2)} (maximum ${maximum})`);
  if (value > maximum) failures.push(`${audit}: ${value.toFixed(2)} > ${maximum}`);
}

if (failures.length > 0) {
  throw new Error(`Mobile Lighthouse budget failed:\n- ${failures.join("\n- ")}`);
}
