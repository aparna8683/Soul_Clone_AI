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
        const generatedDir = path.resolve("generated-site");
        const buildResult = await validateAndRepairBuild(generatedDir, 2);

        res.json({
            websiteSpec,
            componentPlan,
            reactSpec,
            appCode,
            buildResult
        });

    } catch (error) {
        console.error("Website analysis failed:", error);

        res.status(500).json({
            error: "Failed to analyze website"
        });
    }
});

export default router;