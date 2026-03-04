---
name: review
description: Review code changes against project standards
user-invocable: true
---

Review the current code changes (staged and unstaged) against the project's coding standards defined in CLAUDE.md.

1. Run `git diff` and `git diff --cached` to see all changes
2. Check changes against CLAUDE.md standards:
   - Type safety (no `any`, proper viem types)
   - BigInt math correctness (WAD helpers used correctly)
   - Config/client separation respected
   - Strategy interface compliance
   - Cap management (absolute and relative caps)
   - No hardcoded values that should be configurable
3. Report any issues found, grouped by severity:
   - **Error**: Must fix before merging (type issues, math bugs, security concerns)
   - **Warning**: Should fix (style inconsistencies, missing error handling)
   - **Info**: Nice to fix (naming, documentation suggestions)
4. Suggest specific fixes for each issue
