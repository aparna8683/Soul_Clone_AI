import { runAI } from "./groq.js";

function parseJson(raw) {
    const fence = String.fromCharCode(96).repeat(3);
    const cleaned = String(raw || "")
        .replace(/^\uFEFF/, "")
        .replace(fence + "json", "")
        .replace(fence, "")
        .trim();

    return JSON.parse(cleaned);
}

function isNumericKey(value) {
    return new RegExp("^\\d+$").test(value);
}

function setPath(target, path, value) {
    const parts = path.split(".").filter(Boolean);
    if (!parts.length) return false;

    let cursor = target;

    for (let index = 0; index < parts.length - 1; index += 1) {
        const part = parts[index];

        if (isNumericKey(part)) {
            const arrayIndex = Number(part);
            if (!Array.isArray(cursor) || !cursor[arrayIndex]) return false;
            cursor = cursor[arrayIndex];
            continue;
        }

        if (!cursor || typeof cursor !== "object" || !(part in cursor)) {
            return false;
        }

        cursor = cursor[part];
    }

    const finalPart = parts[parts.length - 1];

    if (Array.isArray(cursor) && isNumericKey(finalPart)) {
        cursor[Number(finalPart)] = value;
        return true;
    }

    if (!cursor || typeof cursor !== "object") return false;

    cursor[finalPart] = value;
    return true;
}

function isAllowedPath(path) {
    const themePath = new RegExp(
        "^theme\\.(primaryColor|secondaryColor|backgroundColor|textColor|fontFamily)$"
    );

    const sectionPath = new RegExp(
        "^sections\\.\\d+\\.(type|layout|image|imageAspectRatio|columns)$"
    );

    const visualPath = new RegExp(
        "^sections\\.\\d+\\.visual\\.(minHeight|contentWidth|imageWidth|imagePosition|imageOverlap|spacing)$"
    );

    const itemPath = new RegExp(
        "^sections\\.\\d+\\.items\\.\\d+\\.(image|imageAspectRatio)$"
    );

    return (
        themePath.test(path) ||
        sectionPath.test(path) ||
        visualPath.test(path) ||
        itemPath.test(path)
    );
}

export async function repairReactSpecVisually(
    reactSpec,
    visualCritique,
    diffMetrics
) {
    const compactSpec = {
        theme: reactSpec?.theme || {},
        sections: (reactSpec?.sections || []).map((section, index) => ({
            index,
            type: section.type,
            title: section.title,
            layout: section.layout,
            image: section.image,
            imageAspectRatio: section.imageAspectRatio,
            columns: section.columns,
            visual: section.visual,
            items: (section.items || []).slice(0, 8).map((item, itemIndex) => ({
                itemIndex,
                title: item.title,
                image: item.image,
                imageAspectRatio: item.imageAspectRatio
            }))
        }))
    };

    const prompt = `
You are the visual repair agent for a website recreation system.

The generated website already builds successfully. Do NOT redesign the entire page.
Apply only small, evidence-based ReactSpec changes that can improve visual similarity.

Visual diff metrics:
${JSON.stringify(diffMetrics, null, 2)}

Visual critic:
${JSON.stringify(visualCritique, null, 2)}

Current ReactSpec:
${JSON.stringify(compactSpec, null, 2)}

Return ONLY valid JSON with this shape:
{
  "patches": [
    {
      "path": "sections.1.visual.imageWidth",
      "value": 900,
      "reason": "short reason"
    }
  ]
}

Rules:
- Maximum 5 patches.
- Only use the allowed paths listed below.
- Do not invent asset IDs. Reuse IDs already present in the spec.
- Do not remove sections.
- Do not change text.
- Prefer spacing, sizing, layout, and correct existing assets.
- If evidence is insufficient, return an empty patches array.

Allowed paths:
theme.primaryColor
theme.secondaryColor
theme.backgroundColor
theme.textColor
theme.fontFamily
sections.N.type
sections.N.layout
sections.N.image
sections.N.imageAspectRatio
sections.N.columns
sections.N.visual.minHeight
sections.N.visual.contentWidth
sections.N.visual.imageWidth
sections.N.visual.imagePosition
sections.N.visual.imageOverlap
sections.N.visual.spacing
sections.N.items.N.image
sections.N.items.N.imageAspectRatio
`;

    const raw = await runAI(prompt, {
        temperature: 0.1,
        max_completion_tokens: 700,
        response_format: { type: "json_object" }
    });

    let parsed;

    try {
        parsed = parseJson(raw);
    } catch {
        return {
            reactSpec,
            patches: [],
            applied: 0,
            error: "Visual repair returned invalid JSON."
        };
    }

    const nextSpec = JSON.parse(JSON.stringify(reactSpec));
    const appliedPatches = [];

    for (const patch of Array.isArray(parsed.patches)
        ? parsed.patches.slice(0, 5)
        : []) {
        if (
            !patch ||
            typeof patch.path !== "string" ||
            !isAllowedPath(patch.path)
        ) {
            continue;
        }

        if (setPath(nextSpec, patch.path, patch.value)) {
            appliedPatches.push({
                path: patch.path,
                value: patch.value,
                reason: patch.reason || ""
            });
        }
    }

    return {
        reactSpec: nextSpec,
        patches: appliedPatches,
        applied: appliedPatches.length
    };
}
