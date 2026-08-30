# Sandcastle

This repo can hand its `ready-for-agent` issues to a sandboxed pi agent that runs the engineering skills (implement -> tdd -> code-review) inside a Docker container on an isolated branch.

## Run

```bash
npx tsx .sandcastle/main.ts
```

The runner picks the next `ready-for-agent` issue with no open blockers, creates a `slice-NN` branch in a git worktree, and runs the agent inside the container with the skills mounted read-only. When it finishes, it prints the branch for review:

```bash
git log slice-NN --oneline
git diff main..slice-NN --stat
git merge slice-NN   # when ready
```

## What the container sees

- The git worktree at `/home/agent/workspace` (the repo, including `docs/agents/*`, `CONTEXT.md`, and ADRs).
- The skills checkout mounted read-only at `/home/agent/.pi/agent/skills`.
- `GH_TOKEN` and the model API key from `.sandcastle/.env`.

The workflow itself is not encoded here - the mounted `implement`, `tdd`, and `code-review` skills are the single source of truth, identical to the host.
