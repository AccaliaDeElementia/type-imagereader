'use sanity'

import { defineConfig } from 'vitest/config'

// Using the istanbul coverage provider rather than v8. The v8 provider had a
// merge-aggregation issue across vitest workers: outer async-arrow exports
// (findSyncItemsViaInsert / findSyncItemsViaCopy) and several class methods
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
    setupFiles: ['./testutils/restoreMocksSetup.ts', './testutils/pubsubGuardSetup.ts'],
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
        'migrations/**',
        'deploy/**',
        // tools/withTimeout.ts is tested via subprocess spawn (process management
        // is its whole behavior); coverage instrumentation runs in the parent
        // process and can't reach the spawned child, so the file would always
        // show 0% covered despite being fully integration-tested.
        'tools/withTimeout.ts',
        // public/scripts/{app,slideshow}/main.ts are browser-bundle entry stubs
        // that fire `bootstrap()` at module top level. The bootstrap function is
        // fully covered by its own spec; the 1-line top-level call site is only
        // reachable by importing the module (which fires the side effect once
        // via the module cache). Testing it in-process would require resetting
        // the module cache + mocking the imported bootstrap, which adds more
        // scaffolding than the file contains.
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
