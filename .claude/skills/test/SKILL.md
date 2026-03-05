---
name: test
description: Run project tests and report results
user-invocable: true
---

Run the project test suite and report results.

1. Run `pnpm build:config` to ensure config is up to date
2. Run `pnpm test:strategies` to run strategy tests (equilizeUtilizations, apyRange)
3. Run `pnpm test:execution` to run execution/integration tests
4. Report test results with pass/fail counts
5. For any failures, show the error details and suggest fixes
