import express from "express";
import path from "path";
import { runAI } from "../ai/groq.js";
import { generateAppFile, generateMainFile, generateStylesFile, generateIndexFile, generatePackageFile } from "../generator/reactGenerator.js";
import { validateAndRepairBuild } from "../generator/buildValidator.js";
import { startPreviewServer } from "../preview/previewServer.js";
import { captureGeneratedScreenshot } from "../preview/previewScreenshot.js";
import { critiqueGeneratedWebsite } from "../ai/visualCritic.js";
import { getLatestWebsiteSpec } from "../state.js";

const router = express.Router();

function normalizeModifiedSpec(currentSpec, proposedSpec, instruction) {
    const base = JSON.parse(JSON.stringify(currentSpec || {}));
    const proposed = proposedSpec && typeof proposedSpec === "object" ? proposedSpec : {};
    const text = String(instruction || "").toLowerCase();
    const explicitRemoval = /\b(remove|delete|hide|drop)\b/.test(text);

    if (proposed.theme && typeof proposed.theme === "object") {
        base.theme = { ...(base.theme || {}), ...proposed.theme };
    }

    if (!Array.isArray(base.sections)) base.sections = [];
    if (!Array.isArray(proposed.sections)) return base;

    const used = new Set();
    const findMatch = (candidate, index) => {
        const title = String(candidate?.title || "").trim().toLowerCase();
        const type = candidate?.type;
        const exact = base.sections.findIndex((section, i) =>
            !used.has(i) &&
            ((title && String(section?.title || "").trim().toLowerCase() === title) ||
             (type && section?.type === type && index === i))
        );
        return exact;
    };

    const merged = proposed.sections.map((candidate, index) => {
        const match = findMatch(candidate, index);
        if (match >= 0) {
            used.add(match);
            return { ...base.sections[match], ...candidate };
        }
        return candidate;
    });

    // For ordinary modifications, preserve source sections the AI omitted.
    // Only allow omission when the user's instruction explicitly requests removal.
    if (!explicitRemoval) {
        base.sections.forEach((section, index) => {
            if (!used.has(index) && !merged.some((item) =>
                item === section ||
                (item?.title && section?.title &&
                 String(item.title).trim().toLowerCase() === String(section.title).trim().toLowerCase())
            )) {
                merged.push(section);
            }
        });
    }

    base.sections = merged;
    return base;
}

function applyDeterministicModification(currentSpec, instruction) {
    const next = JSON.parse(JSON.stringify(currentSpec || {}));
    const text = String(instruction || "");
    const lower = text.toLowerCase();

    if (/primary color|primary colour|main color|main colour/.test(lower)) {
        const colorMatch = text.match(/(?:to|as)\s+(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)\b/i);
        if (colorMatch) next.theme = { ...(next.theme || {}), primaryColor: colorMatch[1] };
    }

    if (/sticky/.test(lower) && /nav|navigation|header/.test(lower)) {
        next.navbarSticky = true;
    }

    if (/remove|delete|hide/.test(lower) && /pricing/.test(lower)) {
        next.sections = (next.sections || []).filter((section) =>
            !/pricing/i.test(String(section.title || "")) &&
            section.type !== "pricing"
        );
    }

    return next;
}

function parseJsonResponse(raw) {
    const cleaned = String(raw || "")
        .replace(/^\uFEFF/, "")
        .replace(/^\`\`\`json\s*/i, "")
        .replace(/^\`\`\`\s*/i, "")
        .replace(/\s*\`\`\`$/i, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) {
            return JSON.parse(cleaned.slice(start, end + 1));
        }
        throw new Error("AI did not return valid JSON.");
    }
}

router.post("/", async (req, res) => {
    try {
        const instruction = String(req.body.prompt || req.body.instruction || "").trim();
        const currentSpec = req.body.currentReactSpec || req.body.reactSpec;
        const websiteSpec = getLatestWebsiteSpec();

        if (!instruction || !currentSpec) {
            return res.status(400).json({
                error: "instruction and reactSpec are required"
            });
        }

        if (!websiteSpec) {
            return res.status(409).json({
                error: "No active website project found.",
                suggestion: "Generate a website first, then submit a modification."
            });
        }

        console.log(`\n🪄 Modifying project: "${instruction}"`);

        const aiPrompt = `You are a React UI modification agent.
User instruction: "${instruction}"
Current React Specification:
${JSON.stringify(currentSpec)}
Apply the requested UI change. Return ONLY valid JSON.
Preserve the exact top-level structure and field types. Change only fields necessary for the instruction.
Do not add explanations, markdown, apologies, or commentary.
If the instruction is vague, make the smallest reasonable UI change instead of refusing.
Keep unrelated sections unchanged.
Never omit existing sections unless the user explicitly asks to remove/delete/hide them.
Never remove existing titles, descriptions, buttons, navigation labels, or images unless the instruction explicitly requests it.
When changing style/layout, preserve all existing content and assets.
For "add" requests, append the new section without rewriting existing sections.`;

        let modifiedReactSpec;
        try {
            const responseRaw = await runAI(aiPrompt, {
                temperature: 0.15,
                max_completion_tokens: 1400,
                response_format: { type: "json_object" },
                reasoning_effort: "none",
                timeout: 60000
            });
            const proposedSpec = parseJsonResponse(responseRaw);
            modifiedReactSpec = normalizeModifiedSpec(currentSpec, proposedSpec, instruction);
        } catch (aiError) {
            console.warn("⚠️ Modification AI unavailable; applying deterministic safe fallback:", aiError.message);
            modifiedReactSpec = applyDeterministicModification(currentSpec, instruction);
        }

        console.log("🎨 Modified React specification created");

        const appCode = await generateAppFile(modifiedReactSpec, websiteSpec);
        await generateMainFile();
        const stylesCode = await generateStylesFile(modifiedReactSpec);
        await generateIndexFile(websiteSpec);
        await generatePackageFile();

        const generatedDir = path.resolve("generated-site");

        console.log("\n🧪 Running build validation...");
        const buildResult = await validateAndRepairBuild(generatedDir, 2);

        let previewUrl = null;
        let visualCritique = null;

        if (buildResult.success) {
            previewUrl = await startPreviewServer(generatedDir);
            console.log("👀 Preview available at:", previewUrl);

            try {
                const generatedScreenshot = await captureGeneratedScreenshot(previewUrl);

                visualCritique = await critiqueGeneratedWebsite(
                    websiteSpec.visualScreenshot || websiteSpec.screenshot,
                    generatedScreenshot
                );

                console.log("🔎 Visual QA completed");
            } catch (visualError) {
                console.warn("⚠️ Visual QA skipped after modification:", visualError.message);
            }
        }

        res.json({
            reactSpec: modifiedReactSpec,
            appCode,
            stylesCode,
            buildResult,
            previewUrl,
            visualCritique
        });

    } catch (error) {
        console.error("Modification failed:", error);
        res.status(500).json({
            error: "Failed to modify project",
            details: error.message
        });
    }
});

export default router;
