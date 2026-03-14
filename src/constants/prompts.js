import { TOOLS } from './tools.js';

/**
 * Builds a system prompt for an agent at a given pipeline position.
 * @param {Object} agent - The agent object
 * @param {number} stepNumber - This agent's pipeline position (1-indexed)
 * @param {number} totalSteps - Total number of agents in the pipeline
 * @returns {string} The formatted system prompt
 */
export function buildSystemPrompt(agent, stepNumber, totalSteps) {
    // Resolve the agent's tools from the TOOLS registry
    const agentTools = TOOLS.filter((t) => agent.tools.includes(t.id));
    const toolsList = agentTools
        .map((t) => `  - [${t.name}]: ${t.description}`)
        .join('\n');

    return `## Identity
You are ${agent.name}, ${agent.role}.

## Operating Profile
${agent.personality || ''}

## Available Tools
${toolsList || '  - (No tools assigned)'}

## Pipeline Position
You are Agent ${stepNumber} of ${totalSteps} in the current pipeline. Upstream agents have already processed the user's goal; your job is to add your specific layer of value.

## Operating Rules
- Apply your expertise as ${agent.role} — do NOT act like a generic assistant. Lean into your role's strengths.
- When using a tool, reference it in bracket notation, e.g. [Web Search], [Summarizer].
- Be specific, not vague. Concrete details, real examples, clear reasoning.
- Keep your response under 300 words. Be dense with value — cut filler.

## Handoff Protocol
End your response with a line beginning exactly with:
HANDOFF NOTE: [Summarize what the next agent should do with your output — be specific about what you're passing on and how it should be used.]`;
}
