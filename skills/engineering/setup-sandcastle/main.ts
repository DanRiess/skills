import { run, pi } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { execSync } from "child_process";

// Sandcastle runner - picks the next unblocked ready-for-agent issue and hands it
// to a pi agent that follows the mounted skills (implement -> tdd -> code-review).
// Run with: npx tsx .sandcastle/main.ts

// --- Configured by /setup-sandcastle ---
const SKILLS_PATH = "/path/to/your/skills/checkout/skills"; // host dir to mount into the container
const MODEL = "claude-sonnet-4-6"; // model the sandboxed pi agent uses
const INSTALL_COMMAND = "pnpm install --no-frozen-lockfile"; // your package manager install

type GhIssue = { number: number; title: string; body: string };

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

// 1. List ready-for-agent issues
const issues = JSON.parse(
  sh(
    `gh issue list --label ready-for-agent --state open --json number,title,body --jq "[.[] | {number, title, body}]"`,
  ),
) as GhIssue[];

if (issues.length === 0) {
  console.log("No open ready-for-agent issues. Run /to-tickets first.");
  process.exit(0);
}

// 2. Pick the first issue with no open blockers (parses the "## Blocked by" section)
function blockersOf(body: string): number[] {
  const section = body.match(/## Blocked by\n\n([\s\S]*?)(?=\n## |$)/)?.[1];
  if (!section || /none/i.test(section)) return [];
  return [...section.matchAll(/#(\d+)\b/g)].map((m) => parseInt(m[1]!));
}

const issue = issues.find((i) =>
  blockersOf(i.body).every((b) => {
    try {
      return sh(`gh issue view ${b} --json state --jq .state`) === "CLOSED";
    } catch {
      return true; // blocker issue doesn't exist - treat as not blocking
    }
  }),
);

if (!issue) {
  console.log("All ready-for-agent issues have open blockers. Nothing to do.");
  process.exit(0);
}

const branch = `slice-${String(issue.number).padStart(2, "0")}`;
console.log(`Implementing #${issue.number}: ${issue.title} on ${branch}`);

// 3. Run the agent in an isolated worktree with the skills mounted read-only
const result = await run({
  agent: pi(MODEL),
  sandbox: docker({
    mounts: [
      {
        hostPath: SKILLS_PATH,
        sandboxPath: "/home/agent/.pi/agent/skills",
        readonly: true,
      },
    ],
  }),
  branchStrategy: { type: "branch", branch },
  promptFile: "./.sandcastle/prompt.md",
  promptArgs: {
    ISSUE_NUMBER: String(issue.number),
    ISSUE_TITLE: issue.title,
  },
  hooks: {
    sandbox: {
      onSandboxReady: [{ command: INSTALL_COMMAND, timeoutMs: 300_000 }],
    },
  },
  idleTimeoutSeconds: 1800,
});

console.log(`\nBranch ${branch} ready for review:`);
console.log(`  git log ${branch} --oneline`);
console.log(`  git diff main..${branch} --stat`);
console.log(`  git merge ${branch}  # when ready`);
if (result.commits.length > 0) {
  console.log(`Commits: ${result.commits.map((c) => c.sha.slice(0, 7)).join(", ")}`);
}
