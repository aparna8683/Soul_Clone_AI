import express from "express";
import path from "path";

import { analyzeWebsite } from "../browser/playwright.js";
import { analyzeWebsiteWithAI } from "../ai/analyzerAgent.js";
import {
    generateReactSpec,
    generateAppFile,
    generateMainFile,
    generateStylesFile,
    generateIndexFile,
    generatePackageFile
} from "../generator/reactGenerator.js";
import { validateAndRepairBuild } from "../generator/buildValidator.js";
import { startPreviewServer } from "../preview/previewServer.js";
import { captureGeneratedScreenshot } from "../preview/previewScreenshot.js";
import { critiqueGeneratedWebsite } from "../ai/visualCritic.js";
import { downloadAssets } from "../browser/assetDownloader.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                error: "Website URL is required"
            });
        }

        console.log(`\n🌐 Analyzing website: ${url}`);

        const websiteSpec = await analyzeWebsite(url);
        console.log("✅ WebsiteSpec created");

        const componentPlan = await analyzeWebsiteWithAI(websiteSpec);
        console.log("🤖 Component plan created");

        const reactSpec = await generateReactSpec(websiteSpec, componentPlan);
        console.log("🎨 React specification created");

        const generatedDir = path.resolve("generated-site");

        console.log("🖼️ Preparing local assets...");
        await downloadAssets(websiteSpec, generatedDir);

        const appCode = await generateAppFile(reactSpec, websiteSpec);
        console.log("⚛️ App.jsx generated");

        const mainCode = await generateMainFile();
        console.log("🚀 main.jsx generated");

        const stylesCode = await generateStylesFile(reactSpec);
        console.log("🎨 styles.css generated");

        const indexCode = await generateIndexFile(websiteSpec);
        console.log("📄 index.html generated");

        const packageCode = await generatePackageFile();
        console.log("📦 package.json generated");
        
        console.log("\n🧪 Running build validation...");
        const buildResult = await validateAndRepairBuild(generatedDir, 2);

        let previewUrl = null;
        let generatedScreenshot = null;
        let visualCritique = null;

        if (buildResult.success) {
            previewUrl = await startPreviewServer(generatedDir);
            console.log("👀 Preview available at:", previewUrl);

            try {
                generatedScreenshot = await captureGeneratedScreenshot(previewUrl);
                console.log("📸 Generated screenshot captured");

                visualCritique = await critiqueGeneratedWebsite(
                    websiteSpec.screenshot,
                    generatedScreenshot
                );

                console.log("🔎 Visual QA completed");
            } catch (visualError) {
                console.warn("⚠️ Visual QA skipped:", visualError.message);
            }
        }

        res.json({
            websiteSpec,
            componentPlan,
            reactSpec,
            appCode,
            buildResult,
            previewUrl,
            generatedScreenshot,
            visualCritique
        });

    } catch (error) {
        console.error("Website analysis failed:", error);

        res.status(500).json({
            error: "Failed to analyze website"
        });
    }
});

export default router;