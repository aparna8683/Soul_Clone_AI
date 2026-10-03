import fs from "fs/promises";
import Groq from "groq-sdk";

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const VISION_MODEL = "qwen/qwen3.8-27b";

function imageToDataUrl(imagePath) {
    return fs.readFile(imagePath)
        .then((buffer) => {
            const base64 = buffer.toString("base64");
            const extension = imagePath.toLowerCase().endsWith(".jpg") ||
                imagePath.toLowerCase().endsWith(".jpeg")
                ? "jpeg"
                : "png";

            return `data:image/${extension};base64,${base64}`;
        });
}

export async function analyzeScreenshot(imagePath) {
    const imageUrl = await imageToDataUrl(imagePath);

    const prompt = `
You are a visual UI reconstruction analyst.

Study the supplied screenshot and return ONLY valid JSON.

Your job is to describe the visual structure that a React generator should reproduce.

Use exactly this shape:

{
  "pageType": "string",
  "viewport": {
    "width": 0,
    "height": 0
  },
  "theme": {
    "primaryColor": "hex",
    "backgroundColor": "hex",
    "surfaceColor": "hex",
    "textColor": "hex",
    "mutedTextColor": "hex",
    "borderColor": "hex",
    "fontStyle": "string"
  },
  "regions": [
    {
      "name": "string",
      "type": "navbar | hero | search | banner | categories | grid | list | content | cta | footer | unknown",
      "position": "top | upper | middle | lower | bottom",
      "layout": "row | column | grid | centered | split | overlay",
      "importance": "high | medium | low",
      "visibleText": ["string"],
      "repeatedItems": 0,
      "imageCount": 0,
      "hasSearchControls": false,
      "notes": "string"
    }
  ],
  "visualRules": {
    "contentWidth": "string",
    "cornerRadius": "string",
    "spacing": "string",
    "shadow": "string",
    "cardStyle": "string",
    "navbarStyle": "string"
  }
}

Rules:
1. Describe what is visibly present, not what you assume should exist.
2. Preserve section order.
3. Identify large visual regions even if they have no heading.
4. Detect search bars, category rows, cards, banners, navigation controls and footers.
5. Count repeated cards/items approximately.
6. Report dominant colors as approximate hex values.
7. Keep visibleText short and useful.
8. Do not generate React or CSS.
9. Return JSON only.
`;

    console.log("👁️ Sending screenshot to vision model...");

    const response = await client.chat.completions.create({
        model: VISION_MODEL,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: prompt
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageUrl
                        }
                    }
                ]
            }
        ],
        temperature: 0.2,
        max_completion_tokens: 2500,
        response_format: {
            type: "json_object"
        }
    }, {
        timeout: 45000
    });

    const content = response?.choices?.[0]?.message?.content?.trim();

    if (!content) {
        throw new Error("Vision model returned an empty response.");
    }

    console.log("👁️ Visual analysis received");

    return JSON.parse(content);
}
