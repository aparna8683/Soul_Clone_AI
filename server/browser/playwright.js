import { chromium } from "playwright";

import { extractDOM } from "./domExtractor.js";
import { extractStructure } from "./structureExtractor.js";
import { extractStyles } from "./cssExtractor.js";
import { extractAssets } from "./assetExtractor.js";
import { captureScreenshot, captureVisualScreenshot } from "./screenshot.js";
import { analyzeScreenshot } from "../ai/visionAgent.js";
import { analyzeResponsive } from "./responsiveAnalyzer.js";
import { captureSectionEvidence } from "./sectionScreenshot.js";
import { extractReconstructionIR, settleAnimations } from "./reconstructionIR.js";

import { buildWebsiteSpec } from "../analyzer/specBuilder.js";

export async function analyzeWebsite(url) {
    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage({
        viewport: {
            width: 1440,
            height: 900
        }
    });

    try {
        console.log("🌐 Opening website:", url);

        // Try to load the website.
        try {
            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 30000
            });
        } catch (error) {
            if (error.name === "TimeoutError") {
                console.warn(
                    "⚠️ Page load timed out. Continuing with the loaded page..."
                );
            } else {
                throw error;
            }
        }

        // Give JavaScript-rendered content a little time to appear.
        await page.waitForTimeout(3000);

        console.log("🎬 Settling entrance animations...");
        await settleAnimations(page);

        console.log("📄 Extracting page title...");
        const title = await page.title();

        console.log("📝 Extracting DOM...");
        const dom = await extractDOM(page);

        console.log("🏗️ Extracting structure...");
        const structure = await extractStructure(page);

        console.log("🧭 Extracting bounded reconstruction IR...");
        const reconstructionIR = await extractReconstructionIR(page);

        console.log("🎨 Extracting styles...");
        const styles = await extractStyles(page);

        console.log("🖼️ Extracting assets...");
        const assets = await extractAssets(page);

        console.log("📸 Capturing screenshot...");
        const screenshot = await captureScreenshot(page);

        console.log("🖼️ Capturing visual-analysis screenshot...");
        const visualScreenshot = await captureVisualScreenshot(page);

        console.log("👁️ Running visual analysis...");
        let visualAnalysis = null;

        try {
            visualAnalysis = await analyzeScreenshot(visualScreenshot);
        } catch (visualError) {
            console.warn(
                "⚠️ Visual analysis unavailable; continuing with DOM/CSS analysis:",
                visualError.message
            );
        }

        console.log("🧩 Capturing section evidence...");
        const sectionEvidence = await captureSectionEvidence(
            page,
            structure.sections
        );

        console.log("📱 Analyzing responsive behavior...");
        const responsive = await analyzeResponsive(page);

        const websiteSpec = buildWebsiteSpec({
            url,
            title,
            dom,
            structure,
            styles,
            assets,
            screenshot,
            visualScreenshot,
            responsive,
            visualAnalysis,
            sectionEvidence,
            reconstructionIR
        });

        console.log("✅ WebsiteSpec created");

        return websiteSpec;

    } catch (error) {
        console.error(
            "❌ Website analysis failed:",
            error
        );

        throw error;

    } finally {
        await browser.close();

        console.log("🌐 Browser closed");
    }
}
