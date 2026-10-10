import { stages } from "../game/constants";
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
        for (const row of result.rows) {
          const current = stages[row.level - 1],
            next = stages[row.level];
          const budget =
            row.level >= 28 && current && next
              ? Math.max(17, Math.log(next.radius / current.radius) / 0.12 + 2)
              : 17;
          expect(row.seconds, `Level ${row.level}`).toBeLessThan(budget);
        }
      }
  },
  180000,
);
