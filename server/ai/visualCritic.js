import fs from "fs/promises";
import Groq from "groq-sdk";

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const VISION_MODEL = "qwen/qwen3.8-27b";

async function toDataUrl(imagePath) {
    const buffer = await fs.readFile(imagePath);
    const base64 = buffer.toString("base64");
    const extension = imagePath.toLowerCase().endsWith(".jpg") ||
        imagePath.toLowerCase().endsWith(".jpeg")
        ? "jpeg"
        : "png";

    return `data:image/${extension};base64,${base64}`;
}

export async function critiqueGeneratedWebsite(originalPath, generatedPath) {
    const original = await toDataUrl(originalPath);
    const generated = await toDataUrl(generatedPath);

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

    const response = await client.chat.completions.create({
        model: VISION_MODEL,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    {
                        type: "image_url",
                        image_url: { url: original }
                    },
                    {
                        type: "image_url",
                        image_url: { url: generated }
                    }
                ]
            }
        ],
        temperature: 0.1,
        max_completion_tokens: 700,
        response_format: { type: "json_object" }
    }, {
        timeout: 45000
    });

    const content = response?.choices?.[0]?.message?.content?.trim();

    if (!content) {
        throw new Error("Visual critic returned an empty response.");
    }

    return JSON.parse(content);
}
