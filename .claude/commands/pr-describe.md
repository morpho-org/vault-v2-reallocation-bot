Generate a PR title and description for the current branch.

## Steps

1. Run `git log main..HEAD --oneline` to see all commits on this branch
2. Run `git diff main...HEAD --stat` to get a summary of changed files
3. Run `git diff main...HEAD` to see the full diff
4. Based on the changes, generate:

### PR Title
- Under 70 characters
- Use conventional format: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

### PR Description

```markdown
## Summary
<!-- 1-3 bullet points describing the high-level changes -->

## Changes
<!-- List key changes grouped by area (config, strategies, utils, tests, etc.) -->

## Test plan
<!-- Checklist of testing steps -->
- [ ] Strategy tests pass (`pnpm test:strategies`)
- [ ] Execution tests pass (`pnpm test:execution`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Config builds successfully (`pnpm build:config`)
```

5. Create the PR using `gh pr create` with the generated title and description
