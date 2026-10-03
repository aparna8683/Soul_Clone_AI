import express from "express";
import path from "path";
import { runAI } from "../ai/groq.js";
import { generateAppFile, generateMainFile, generateStylesFile, generateIndexFile, generatePackageFile } from "../generator/reactGenerator.js";
import { validateAndRepairBuild } from "../generator/buildValidator.js";
import { startPreviewServer } from "../preview/previewServer.js";
import { captureGeneratedScreenshot } from "../preview/previewScreenshot.js";
import { critiqueGeneratedWebsite } from "../ai/visualCritic.js";

const router = express.Router();

function parseJsonResponse(raw) {
    const cleaned = String(raw || "").replace(/^\uFEFF/, "").replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    try { return JSON.parse(cleaned); }
    catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
        throw new Error("AI did not return valid JSON.");
    }
}

router.post("/", async (req, res) => {
    try {
        const instruction = String(req.body.prompt || req.body.instruction || "").trim();
        const currentSpec = req.body.currentReactSpec || req.body.reactSpec;
        const { websiteSpec } = req.body;
        if (!instruction || !currentSpec) return res.status(400).json({ error: "instruction and reactSpec are required" });

        console.log(`\n🪄 Modifying project: "${instruction}"`);
        const aiPrompt = `You are a React UI modification agent.
User instruction: "${instruction}"
Current React Specification:
${JSON.stringify(currentSpec)}
Apply the requested UI change. Return ONLY valid JSON.
Preserve the exact top-level structure and field types. Change only fields necessary for the instruction.
Do not add explanations, markdown, apologies, or commentary.
If the instruction is vague, make the smallest reasonable UI change instead of refusing.
Keep unrelated sections unchanged.`;

        const responseRaw = await runAI(aiPrompt);
        let modifiedReactSpec;
        try { modifiedReactSpec = parseJsonResponse(responseRaw); }
        catch (parseError) {
            console.error("❌ Modification AI returned non-JSON:", responseRaw);
            return res.status(422).json({ error: "AI could not produce a valid modification.", details: parseError.message, suggestion: "Try a specific instruction such as: change the primary color to blue." });
        }

        console.log("🎨 Modified React specification created");
        const appCode = await generateAppFile(modifiedReactSpec, websiteSpec);
        await generateMainFile();
        const stylesCode = await generateStylesFile(modifiedReactSpec);
        if (websiteSpec) await generateIndexFile(websiteSpec);
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
                if (websiteSpec?.visualScreenshot || websiteSpec?.screenshot) visualCritique = await critiqueGeneratedWebsite(websiteSpec.visualScreenshot || websiteSpec.screenshot, generatedScreenshot);
            } catch (visualError) {
                console.warn("⚠️ Visual QA skipped after modification:", visualError.message);
            }
        }
        res.json({ reactSpec: modifiedReactSpec, appCode, stylesCode, buildResult, previewUrl, visualCritique });
    } catch (error) {
        console.error("Modification failed:", error);
        res.status(500).json({ error: "Failed to modify project", details: error.message });
    }
});

export default router;
