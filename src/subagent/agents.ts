import * as fs from "node:fs";
import * as path from "node:path";

export type AgentScope = "user" | "project" | "both";

export interface AgentConfig {
  name: string;
  description: string;
  tools?: string[];
  model?: string;
  openai_model?: string;
  gemini_model?: string;
  systemPrompt: string;
  source: "user" | "project";
  filePath: string;
}

export interface AgentDiscoveryResult {
  agents: AgentConfig[];
  projectAgentsDir: string | null;
}

// Simple built-in frontmatter parser
function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const parts = content.split("---");
  if (parts.length < 3) return { frontmatter: {}, body: content };

  const fmStr = parts[1];
  const body = parts.slice(2).join("---").trim();
  const frontmatter: Record<string, string> = {};

  fmStr.split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) frontmatter[key.trim()] = rest.join(":").trim();
  });

  return { frontmatter, body };
}

function loadAgentsFromDir(dir: string, source: "user" | "project"): AgentConfig[] {
  const agents: AgentConfig[] = [];
  if (!fs.existsSync(dir)) return agents;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return agents;
  }

  for (const entry of entries) {
    if (!entry.name.endsWith(".md")) continue;
    const filePath = path.join(dir, entry.name);
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }
    const { frontmatter, body } = parseFrontmatter(content);

    if (!frontmatter.name || !frontmatter.description) continue;

    const tools = frontmatter.tools
      ?.split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    agents.push({
      name: frontmatter.name,
      description: frontmatter.description,
      tools: tools && tools.length > 0 ? tools : undefined,
      model: frontmatter.model,
      openai_model: frontmatter.openai_model,
      gemini_model: frontmatter.gemini_model,
      systemPrompt: body,
      source,
      filePath,
    });
  }
  return agents;
}

export function discoverAgents(cwd: string): AgentDiscoveryResult {
  const localAgentsDir = path.join(cwd, "src", "subagent", "agents");
  const agents = loadAgentsFromDir(localAgentsDir, "project");

  return { agents, projectAgentsDir: localAgentsDir };
}
