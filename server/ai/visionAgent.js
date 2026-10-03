import { runVisionAI } from "./groq.js";

export async function analyzeScreenshot(imagePath) {
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
10. Pay special attention to the size and placement of product screenshots, mockups, illustrations and large empty space.
`;

    console.log("👁️ Running visual analysis with Groq vision...");

    const response = await runVisionAI(
        prompt,
        [imagePath],
        {
            temperature: 0.2,
            max_completion_tokens: 700,
            response_format: {
                type: "json_object"
            },
            reasoning_effort: "none",
            timeout: 45000
        }
    );

    if (!response) {
        throw new Error("Vision model returned an empty response.");
    }

    console.log("👁️ Visual analysis received");

    return JSON.parse(response);
}
