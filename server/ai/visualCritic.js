import { runVisionAI } from "./groq.js";

export async function critiqueGeneratedWebsite(originalPath, generatedPath) {
    const prompt = `
You are a visual QA engineer for an AI website recreation system.

Compare IMAGE 1 (original website) with IMAGE 2 (generated React website).

Return ONLY valid JSON:

{
  "overall": "close | partial | poor",
  "issues": [
    {
      "type": "missing | layout | spacing | typography | color | asset | responsive | other",
      "severity": "high | medium | low",
      "area": "string",
      "issue": "string",
      "fix": "string"
    }
  ]
}

Rules:
- Compare only what is visibly different.
- Focus on high-impact differences first.
- Do not complain about functionality that cannot be observed.
- Do not invent details.
- Maximum 8 issues.
- Return JSON only.
`;

    const response = await runVisionAI(
        prompt,
        [originalPath, generatedPath],
        {
            temperature: 0.1,
            max_completion_tokens: 700,
            response_format: { type: "json_object" },
            timeout: 45000
        }
    );

    if (!response) {
        throw new Error("Visual critic returned an empty response.");
    }

    return JSON.parse(response);
}
