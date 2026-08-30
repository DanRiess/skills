---
name: setup-sandcastle
description: "Configure this repo for sandboxed AFK implementation: scaffold a .sandcastle/ directory that mounts the engineering skills into an isolated Docker container and hands ready-for-agent issues to them. Run once per repo, after setup-matt-pocock-skills, if you want implement to run in a sandbox."
disable-model-invocation: true
---

# Setup Sandcastle

Scaffold the per-repo configuration that lets the engineering skills run inside an isolated Docker container:

- **`.sandcastle/`** - a Docker image, an orchestration script, and a prompt that mount the skills into the container and hand issues to them
- **Skills mount** - the single source of truth for the workflow: the same `SKILL.md` files the host uses, bind-mounted read-only into the container at `/home/agent/.pi/agent/skills`
- **Sandcastle docs** - `docs/agents/sandcastle.md`, describing how to run and what the container sees

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

## Process

### 1. Precondition check

Verify the two hard dependencies exist. If either is missing, abort with a clear message - don't scaffold.

- **Docker** - `docker --version` succeeds.
- **`@ai-hero/sandcastle`** - search for `node_modules/@ai-hero/sandcastle/README.md` in this project, then in `$(npm root -g)/@ai-hero/sandcastle/README.md`. If neither exists, the package isn't installed - abort. Once found, use that README as the API reference for the exact CLI commands (they vary by version).

### 2. Explore

- `docs/agents/issue-tracker.md` - this skill consumes the tracker that `/setup-matt-pocock-skills` configured. If it's missing, stop and tell the user to run `/setup-matt-pocock-skills` first.
- `.sandcastle/` - if it already exists, present what's there and ask before overwriting; it's the user's customization.
- The tracker type recorded in `docs/agents/issue-tracker.md`. The seed orchestration assumes GitHub; for GitLab or local markdown, adapt the issue-listing logic in `main.ts`.

### 3. Present findings and ask

Lead each section with the recommended answer so the user can accept it in a word.

**Section A: Skills directory to mount.** The container runs the same skills as the host, so they must be visible inside it. Ask for the path to the directory whose subfolders are the skills - `skills/` in a checkout of this repo, or `~/.pi/agent/skills`. Default: this repo's `skills/` folder if it has `SKILL.md` files under it. The mount target is always `/home/agent/.pi/agent/skills`, read-only.

**Section B: Model.** Which model the sandboxed agent runs. Default: the model the user runs pi with locally.

**Section C: Sandbox provider.** Docker by default; Podman if the user prefers (then the `dockerfile` seed becomes a `Containerfile` and the build command changes accordingly).

### 4. Write

Scaffold `.sandcastle/` from the seed files in this skill folder:

- [dockerfile](./dockerfile) → `.sandcastle/Dockerfile`
- [main.ts](./main.ts) → `.sandcastle/main.ts` (substitute `SKILLS_PATH` and `MODEL`)
- [prompt.md](./prompt.md) → `.sandcastle/prompt.md`
- [env.example](./env.example) → `.sandcastle/.env.example`

Then copy `.sandcastle/.env.example` to `.sandcastle/.env` and tell the user to fill in `GH_TOKEN` and the model's API key - credentials only the user can provide.

Build the image with the sandcastle CLI's build command (from the package README found in step 1), e.g. `sandcastle docker build-image`.

Write [sandcastle.md](./sandcastle.md) → `docs/agents/sandcastle.md`, and add a `### Sandcastle` sub-block to the `## Agent skills` section of whichever of `CLAUDE.md` / `AGENTS.md` exists (the same file `/setup-matt-pocock-skills` edited - update in place, don't duplicate).

### 5. Done

Tell the user setup is complete and how to run it: `npx tsx .sandcastle/main.ts`, or add `"sandcastle": "npx tsx .sandcastle/main.ts"` to `package.json` scripts. Mention that issues come from `/to-tickets` - any `ready-for-agent` issue with no open blockers is picked up, one per run, on a `slice-NN` branch for review. Warn that headless runs can stall on a blocking question (`/tdd` refusing an unconfirmed seam): the skills assume a human at the terminal, so the run waits for input until its idle timeout - an open gap this skill does not patch.
