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
import { compareScreenshots } from "../ai/visualDiff.js";
import { repairReactSpecVisually } from "../ai/visualRepairAgent.js";
import { downloadAssets, copySectionEvidence } from "../browser/assetDownloader.js";
import { setLatestWebsiteSpec } from "../state.js";

const router = express.Router();

const MAX_VISUAL_REPAIR_ITERATIONS = 2;
const MIN_VISUAL_IMPROVEMENT = 0.005;

async function writeGeneratedProject(reactSpec, websiteSpec, generatedDir) {
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

    return {
        appCode,
        mainCode,
        stylesCode,
        indexCode,
        packageCode
    };
}

async function runVisualRepairLoop({
    websiteSpec,
    reactSpec,
    generatedDir,
    initialScreenshot,
    initialCritique
}) {
    let bestReactSpec = JSON.parse(JSON.stringify(reactSpec));
    let bestScreenshot = initialScreenshot;
    let bestCritique = initialCritique;
    let bestDiff = null;
    let iterations = 0;

    try {
        bestDiff = compareScreenshots(
            websiteSpec.visualScreenshot || websiteSpec.screenshot,
            bestScreenshot
        );
        console.log(
            `📊 Initial visual similarity: ${(
                (bestDiff.similarity ?? 0) * 100
            ).toFixed(1)}%`
        );
    } catch (error) {
        console.warn("⚠️ Initial pixel diff unavailable:", error.message);
        return {
            reactSpec: bestReactSpec,
            screenshot: bestScreenshot,
            critique: bestCritique,
            diff: null,
            iterations
        };
    }

    for (let iteration = 1; iteration <= MAX_VISUAL_REPAIR_ITERATIONS; iteration += 1) {
        if (!bestCritique || bestCritique.overall === "close") {
            break;
        }

        console.log(`🛠️ Visual repair iteration ${iteration}...`);

        let repair;
        try {
            repair = await repairReactSpecVisually(
                bestReactSpec,
                bestCritique,
                bestDiff
            );
        } catch (error) {
            console.warn("⚠️ Visual repair unavailable:", error.message);
            break;
        }

        if (!repair.applied) {
            console.log("ℹ️ Visual repair produced no safe patches.");
            break;
        }

        console.log(
            `🩹 Applying ${repair.applied} visual patches:`,
            repair.patches
        );

        await writeGeneratedProject(
            repair.reactSpec,
            websiteSpec,
            generatedDir
        );

        const buildResult = await validateAndRepairBuild(generatedDir, 1);

        if (!buildResult.success) {
            console.warn("⚠️ Visual repair build failed; keeping previous version.");
            await writeGeneratedProject(
                bestReactSpec,
                websiteSpec,
                generatedDir
            );
            await validateAndRepairBuild(generatedDir, 1);
            continue;
        }

        let candidatePreviewUrl = null;

        try {
            candidatePreviewUrl = await startPreviewServer(generatedDir);
            const candidateScreenshot =
                await captureGeneratedScreenshot(candidatePreviewUrl);

            const candidateDiff = compareScreenshots(
                websiteSpec.visualScreenshot || websiteSpec.screenshot,
                candidateScreenshot
            );

            console.log(
                `📊 Candidate similarity: ${(
                    (candidateDiff.similarity ?? 0) * 100
                ).toFixed(1)}%`
            );

            const candidateCritique =
                await critiqueGeneratedWebsite(
                    websiteSpec.visualScreenshot || websiteSpec.screenshot,
                    candidateScreenshot
                );

            const improved =
                candidateDiff.comparable &&
                bestDiff?.comparable &&
                candidateDiff.similarity >=
                    (bestDiff.similarity + MIN_VISUAL_IMPROVEMENT);

            if (improved) {
                bestReactSpec = repair.reactSpec;
                bestScreenshot = candidateScreenshot;
                bestDiff = candidateDiff;
                bestCritique = candidateCritique;
                iterations = iteration;

                console.log("✅ Visual repair improved the generated page.");
            } else {
                console.log("↩️ Visual repair did not improve the pixel score; reverting.");

                await writeGeneratedProject(
                    bestReactSpec,
                    websiteSpec,
                    generatedDir
                );

                const restoreBuild =
                    await validateAndRepairBuild(generatedDir, 1);

                if (!restoreBuild.success) {
                    console.warn(
                        "⚠️ Failed to rebuild the previous visual version after rejection."
                    );
                }

                try {
                    await startPreviewServer(generatedDir);
                } catch (restorePreviewError) {
                    console.warn(
                        "⚠️ Failed to restore previous preview:",
                        restorePreviewError.message
                    );
                }

                break;
            }
        } catch (error) {
            console.warn(
                "⚠️ Visual repair comparison failed; reverting:",
                error.message
            );

            await writeGeneratedProject(
                bestReactSpec,
                websiteSpec,
                generatedDir
            );
            await validateAndRepairBuild(generatedDir, 1);

            try {
                await startPreviewServer(generatedDir);
            } catch {
                // The next route-level preview attempt will surface the real error.
            }

            break;
        }
    }

    return {
        reactSpec: bestReactSpec,
        screenshot: bestScreenshot,
        critique: bestCritique,
        diff: bestDiff,
        iterations
    };
}

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

        setLatestWebsiteSpec(websiteSpec);

        const componentPlan = await analyzeWebsiteWithAI(websiteSpec);
        console.log("🤖 Component plan created");

        let reactSpec = await generateReactSpec(
            websiteSpec,
            componentPlan
        );
        console.log("🎨 React specification created");

        const generatedDir = path.resolve("generated-site");

        console.log("🖼️ Preparing local assets...");
        await downloadAssets(websiteSpec, generatedDir);
        await copySectionEvidence(websiteSpec, generatedDir);

        await writeGeneratedProject(
            reactSpec,
            websiteSpec,
            generatedDir
        );

        console.log("\n🧪 Running build validation...");
        let buildResult = await validateAndRepairBuild(
            generatedDir,
            2
        );

        let previewUrl = null;
        let generatedScreenshot = null;
        let visualCritique = null;
        let visualDiff = null;
        let visualRepairIterations = 0;

        if (buildResult.success) {
            previewUrl = await startPreviewServer(generatedDir);
            console.log("👀 Preview available at:", previewUrl);

            try {
                generatedScreenshot =
                    await captureGeneratedScreenshot(previewUrl);

                console.log("📸 Generated screenshot captured");

                visualCritique =
                    await critiqueGeneratedWebsite(
                        websiteSpec.visualScreenshot ||
                            websiteSpec.screenshot,
                        generatedScreenshot
                    );

                console.log("🔎 Visual QA completed");

                const repaired = await runVisualRepairLoop({
                    websiteSpec,
                    reactSpec,
                    generatedDir,
                    initialScreenshot: generatedScreenshot,
                    initialCritique: visualCritique
                });

                reactSpec = repaired.reactSpec;
                generatedScreenshot = repaired.screenshot;
                visualCritique = repaired.critique;
                visualDiff = repaired.diff;
                visualRepairIterations = repaired.iterations;

                // The final generated files are the accepted best version.
                if (visualRepairIterations > 0) {
                    console.log(
                        `✅ Accepted visual repair iterations: ${visualRepairIterations}`
                    );
                }

                buildResult = {
                    ...buildResult,
                    visualRepairIterations
                };
            } catch (visualError) {
                console.warn(
                    "⚠️ Visual QA/repair skipped:",
                    visualError.message
                );
            }
        }

        res.json({
            componentPlan,
            reactSpec,
            buildResult,
            previewUrl,
            visualCritique,
            visualDiff: visualDiff
                ? {
                    comparable: visualDiff.comparable,
                    diffPixels: visualDiff.diffPixels,
                    totalPixels: visualDiff.totalPixels,
                    diffRatio: visualDiff.diffRatio,
                    similarity: visualDiff.similarity,
                    width: visualDiff.width,
                    height: visualDiff.height
                }
                : null,
            visualRepairIterations
        });
    } catch (error) {
        console.error("Website analysis failed:", error);

        res.status(500).json({
            error: "Failed to analyze website",
            details: error.message
        });
    }
});

export default router;
