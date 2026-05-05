import { defineConfig } from 'vitest/config'

// Using the istanbul coverage provider rather than v8. The v8 provider had a
// merge-aggregation issue across vitest workers: outer async-arrow exports
// (FindSyncItemsViaInsert / FindSyncItemsViaCopy) and several class methods
// reported FNDA:0 in the aggregated lcov even though their inner async-arrow
// callbacks reported 50+ calls — an impossible state that pointed to the
// merger losing per-worker coverage data for those functions. Istanbul
// instruments the source at parse time and aggregates plain JS counters;
// it sidesteps the v8-inspector merge path entirely.
//
// Reproduction filed upstream at /config/workspace/vitest-coverage-issue.
const FULL_COVERAGE = 100
const TEST_TIMEOUT_MS = 1000
const SLOW_TEST_THRESHOLD_MS = 75
const FLAKY_RETRY_COUNT = 1

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.spec.ts'],
    retry: FLAKY_RETRY_COUNT,
    testTimeout: TEST_TIMEOUT_MS,
    slowTestThreshold: SLOW_TEST_THRESHOLD_MS,
    coverage: {
      provider: 'istanbul',
      reporter: ['lcov', 'text', 'text-summary'],
      include: ['**/*.ts'],
      exclude: [
        '**/*.spec.ts',
        '**/*.d.ts',
        'knexfile.ts',
        'migrations/**',
        'deploy/**',
        'public/scripts/app/main.ts',
        'public/scripts/slideshow/main.ts',
      ],
      thresholds: {
        statements: FULL_COVERAGE,
        branches: FULL_COVERAGE,
        functions: FULL_COVERAGE,
        lines: FULL_COVERAGE,
      },
    },
  },
})
