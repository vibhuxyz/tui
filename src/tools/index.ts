
import { weatherTool } from "./weather-tool";
import { lsTool } from "./ls-tool";
import { findTool } from "./find-tool";
import { grepTool } from "./grep-tool";
import { readTool } from "./read-tool";
import { planTool } from "./plan-tool";
import { nativeSubagentTool } from "../subagent/index";
import { bashTool } from "./bash-tool";
import { writeTool } from "./write-tool";
import { editTool } from "./edit-tool";
import { AgentTool } from "../types";

export { weatherTool, lsTool };

export function getAllTools(): AgentTool[] {
  return [
    weatherTool,
    lsTool,
    findTool,
    grepTool,
    readTool,
    planTool,
    nativeSubagentTool,
    bashTool,
    writeTool,
    editTool
  ];
}

export function getOrchestratorTools(): AgentTool[] {
  return [weatherTool, planTool, nativeSubagentTool];
}

export function getReadOnlyTools(): AgentTool[] {
  return [lsTool, findTool, grepTool, readTool];
}
