import type { AgentTool, AgentToolResult } from "../types";

export const weatherTool: AgentTool = {
  name: "get_current_weather",
  label: "Weather",
  description: "Gets the current weather for a specific city.",

  schema: {
    type: "function",
    function: {
      name: "get_current_weather",
      description:
        "Gets the current weather for a specific city. Use this when the user asks for weather conditions.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city name, e.g., Delhi, London",
          },
        },
        required: ["location"],
      },
    },
  },

  execute: async (args: any): Promise<AgentToolResult> => {
    try {
      console.log(" args from Openaai:", JSON.stringify(args));
      console.log(`\n[system] running whether tool for : ${args.location}...`);
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${args.location}&appid=bd5e378503939ddaee76f12ad7a97608&units=metric`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = await response.json();

      const wheaterString = `The current wheater in ${args.location} is ${result.main.temp} C and ${result.weather[0].description}.`;
      return {
        content: [{ type: "text", text: wheaterString }],
        details: {},
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: "Failed to get weather from API." }],
        details: {},
      };
    }
  },
};
