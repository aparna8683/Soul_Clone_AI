import express from "express";
import path from "path";
import { runAI } from "../ai/groq.js";
import {
    generateAppFile,
    generateMainFile,
    generateStylesFile,
    generateIndexFile,
    generatePackageFile
} from "../generator/reactGenerator.js";
import { validateAndRepairBuild } from "../generator/buildValidator.js";
import { startPreviewServer } from "../preview/previewServer.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { prompt, currentReactSpec, websiteSpec } = req.body;

        if (!prompt || !currentReactSpec) {
            return res.status(400).json({ error: "prompt and currentReactSpec are required" });
        }

        console.log(`\n🪄 Modifying project: "${prompt}"`);

        const aiPrompt = `
You are a React UI architecture modifier.

User instruction: "${prompt}"

Current React Specification:
${JSON.stringify(currentReactSpec)}

Modify the JSON according to the user instruction.
Do NOT rewrite the entire project or change unrelated sections.
Return ONLY the modified valid JSON.
Keep the exact same structure as the current React Specification.
`;

        const responseRaw = await runAI(aiPrompt);
        const modifiedSpecRaw = responseRaw.replace(/^```json\n/i, "").replace(/^```\n/i, "").replace(/```$/i, "").trim();
        const modifiedReactSpec = JSON.parse(modifiedSpecRaw);

        console.log("🎨 Modified React specification created");

        const appCode = await generateAppFile(modifiedReactSpec, websiteSpec);
        console.log("⚛️ App.jsx regenerated");

        await generateMainFile();
        const stylesCode = await generateStylesFile(modifiedReactSpec);
        console.log("🎨 styles.css regenerated");
        
        if (websiteSpec) await generateIndexFile(websiteSpec);
        await generatePackageFile();

        console.log("\n🧪 Running build validation...");
        const generatedDir = path.resolve("generated-site");
        const buildResult = await validateAndRepairBuild(generatedDir, 2);

        let previewUrl = null;
        if (buildResult.success) {
            previewUrl = await startPreviewServer(generatedDir);
            console.log("👀 Preview available at:", previewUrl);
        }

        res.json({
            reactSpec: modifiedReactSpec,
            appCode,
            stylesCode,
            buildResult,
            previewUrl
        });

    } catch (error) {
        console.error("Modification failed:", error);
        res.status(500).json({ error: "Failed to modify project" });
    }
});

export default router;
