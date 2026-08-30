## What it does

`setup-sandcastle` scaffolds a per-repo `.sandcastle/` directory so the engineering skills can run inside an isolated Docker container. It does not reimplement the skills - it mounts them read-only into the container and hands each issue to them, so the workflow stays a single source of truth.

It is a setup skill, not an execution skill: it runs once per repo and produces configuration (a Docker image, an orchestration script, a prompt); the actual build work still happens through [implement](https://aihero.dev/skills-implement), [tdd](https://aihero.dev/skills-tdd), and [code-review](https://aihero.dev/skills-code-review), just inside a sandbox.

## When to reach for it

You invoke this by typing `/setup-sandcastle` - the agent won't reach for it on its own. Reach for it once per repo, after [setup-matt-pocock-skills](https://aihero.dev/skills-setup-matt-pocock-skills), when you want [implement](https://aihero.dev/skills-implement) to run AFK on an isolated branch instead of in your session. For watching one issue live in your own checkout, skip it - that's just `/implement`.

## Prerequisites

- [setup-matt-pocock-skills](https://aihero.dev/skills-setup-matt-pocock-skills) must have run, so the issue tracker and `ready-for-agent` label are configured.
- Docker (or Podman) and the `@ai-hero/sandcastle` package must be installed.
- A checkout of the skills themselves, to mount into the container.

## The skills mount

The one idea the skill runs on is the **mount**: the container runs the same `SKILL.md` files the host does, bind-mounted read-only at `/home/agent/.pi/agent/skills`. The orchestration script holds no workflow logic - it picks the next unblocked `ready-for-agent` issue and hands it to the mounted `implement` skill, which drives `tdd` and closes out with `code-review`, exactly as it does outside the sandbox. Sandboxed and non-sandboxed runs differ only in the invocation and where the commit lands.

## Common questions

**Do I need sandcastle to run the local-issue flow?**

No. `ready-for-agent` issues run fine in your session with `/implement`, committing to your current branch. `setup-sandcastle` is only for running the same build headless, one issue per isolated branch.

**Can `/implement` auto-sequence a whole feature?**

No, and that's deliberate. Sequencing issues is orchestration, not engineering work. The runner here does the sequencing - it picks the next unblocked issue and runs it - but one issue per invocation, so each lands on its own `slice-NN` branch for you to review before merging.

**Where's the line between the skills and sandcastle?**

The skills are the interactive, single-session path; sandcastle is the headless fan-out. Worktrees are sandcastle's job, which is why a sandboxed run never shares a tree with another session. The workflow inside the container is still the skills, unchanged.

**Does it open a PR or close the issue when it finishes?**

No. Matching `/implement`, the run commits and reports the branch; it does not close the issue or tick its acceptance criteria. You review with `git log`, merge when ready, and reconcile the issue yourself.

**What happens when the run hits a blocking question?**

It stalls. The skills assume a human is at the terminal - if `/tdd` refuses an unconfirmed seam, the agent asks into a prompt nobody is reading, and the run waits until its idle timeout. Headless completion and escalation are tracked separately in [#508](https://github.com/mattpocock/skills/issues/508) and [#883](https://github.com/mattpocock/skills/issues/883); this skill does not paper over them.

## It's working if

- The `.sandcastle/prompt.md` is a few lines naming the `implement` skill, not a copy of the TDD loop.
- A run opens by reading the skill's `SKILL.md` and restating the issue, not by inventing a workflow.
- The run lands on a `slice-NN` branch you can review with `git log` before merging.
- Re-running picks up the next unblocked `ready-for-agent` issue, not the same one twice.

## Where it fits

`setup-sandcastle` is a **run-once setup**, like [setup-matt-pocock-skills](https://aihero.dev/skills-setup-matt-pocock-skills) - but where that one configures the tracker the planning skills write to, this one configures the sandbox the execution skills run in. It sits between the planning and execution halves of the chain: [to-tickets](https://aihero.dev/skills-to-tickets) publishes `ready-for-agent` issues; the runner this skill scaffolds consumes them; the mounted [implement](https://aihero.dev/skills-implement) skill does the build.

```txt
grill-with-docs → to-spec → to-tickets → implement → code-review
```

For the whole set at a glance, see [ask-matt](https://aihero.dev/skills-ask-matt).
