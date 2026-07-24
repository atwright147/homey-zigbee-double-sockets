---
name: github
description: Use when the user asks about GitHub Actions pipeline failures, CI status, workflow runs, or diagnosing pipeline errors. Provides commands and patterns for inspecting GitHub Actions runs via `gh` CLI.
---

# GitHub Pipeline Diagnostics

Use `gh` CLI to inspect pipeline runs and diagnose failures.

## Check latest workflow run status

```bash
gh run list --limit 5 --json conclusion,displayTitle,status,headBranch,createdAt,url
```

## View logs for a failed run

```bash
gh run view <run-id> --log --failed
```

## View job steps for a run

```bash
gh run view <run-id>
```

## Re-run a failed workflow

```bash
gh run rerun <run-id>
```

## Common patterns

When debugging a pipeline failure:
1. `gh run list --limit 3 -b <branch>` — find recent runs on the branch
2. `gh run view <run-id>` — see which jobs/steps failed
3. `gh run view <run-id> --log --failed` — get the actual error output

## Known issue: `homey-app-version` changelog parsing

The `athombv/github-action-homey-app-version@master` action passes `changelog` directly to `homey app version`. If the changelog starts with `-` (e.g. `- xxx`), the CLI interprets it as flags, producing `Unknown arguments`. Fix: ensure changelog text does not start with `-`, or quote it in the workflow file.