import { AgentTool } from "../types";
import { weatherTool } from "./weather-tool";
import { lsTool } from "./ls-tool";
import { findTool } from "./find-tool";
import { grepTool } from "./grep-tool";
import { readTool } from "./read-tool";

export { weatherTool, lsTool };

export function getAllTools(): AgentTool[] {
  return [weatherTool, lsTool, findTool, grepTool, readTool];
}

export function getReadOnlyTools(): AgentTool[] {
  return [lsTool];
}
