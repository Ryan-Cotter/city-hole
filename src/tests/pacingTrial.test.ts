import { it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { pacingTrial } from "../testing/PacingTrial";
it.skipIf(!process.env.RUN_PACING)(
  "records complete real-loop autoplay trials",
  () => {
    const results = (process.env.TRIAL_CITIES ?? "0")
      .split(",")
      .map(Number)
      .map((city) => {
        const result = pacingTrial(
          city,
          Number(process.env.TRIAL_LIMIT ?? 900),
          Number(process.env.TRIAL_DT ?? 1 / 60),
          process.env.TRIAL_STRAIN === "1",
        );
        console.log(JSON.stringify(result));
        return result;
      });
    writeFileSync(
      process.env.TRIAL_OUTPUT ?? "/tmp/city-pacing.json",
      JSON.stringify(results, null, 2),
    );
    if (process.env.VERIFY_PACING)
      for (const result of results) {
        expect(
          result.completed,
          `City ${result.cityIndex} did not finish`,
        ).toBe(true);
        expect(result.seconds).toBeGreaterThanOrEqual(180);
        expect(result.seconds).toBeLessThanOrEqual(300);
        expect(result.remaining).toBe(0);
        expect(result.generatedDuringPlay).toBe(0);
        expect(Math.max(...result.rows.map((row) => row.seconds))).toBeLessThan(
          17, // Mixed layouts allow up to two extra seconds of route variation.
        );
      }
  },
  180000,
);
