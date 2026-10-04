import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { extractDOM } from "../../browser/domExtractor.js";
import { extractStructure } from "../../browser/structureExtractor.js";
import { extractStyles } from "../../browser/cssExtractor.js";
import { extractAssets } from "../../browser/assetExtractor.js";
import { extractReconstructionIR, settleAnimations } from "../../browser/reconstructionIR.js";
import { buildWebsiteSpec } from "../../analyzer/specBuilder.js";
import { downloadAssets } from "../../browser/assetDownloader.js";
import {
    generateReactSpec, generateAppFile, generateMainFile,
    generateStylesFile, generateIndexFile, generatePackageFile
} from "../../generator/reactGenerator.js";
import { compareScreenshots } from "../../ai/visualDiff.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, "../..");
const sourceUrl = process.env.SOURCE_URL || "https://linear.app/";
const outputDir = process.env.DIAGNOSTIC_DIR ? path.resolve(serverDir, process.env.DIAGNOSTIC_DIR) : here;
const generatedDir = path.join(serverDir, "generated-site");
const sourcePath = path.join(outputDir, "source.png");
const generatedPath = path.join(outputDir, "generated.png");
const viewport = { width: 1440, height: 900 };
const cleanSpec = (value) => JSON.stringify(value, null, 2);

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
let previewProcess;

try {
    const page = await browser.newPage({ viewport });
    await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);
    await settleAnimations(page);

    const [title, dom, structure, styles, assets, reconstructionIR] = await Promise.all([
        page.title(), extractDOM(page), extractStructure(page), extractStyles(page),
        extractAssets(page), extractReconstructionIR(page)
    ]);
    await page.screenshot({ path: sourcePath, fullPage: false, type: "png" });

    const websiteSpec = buildWebsiteSpec({
        url: sourceUrl, title, dom, structure, styles, assets,
        screenshot: sourcePath, visualScreenshot: sourcePath, responsive: {},
        visualAnalysis: null, sectionEvidence: [], reconstructionIR
    });
    const reactSpec = await generateReactSpec(websiteSpec, { pageType: "website", components: [] }, { useAI: false });
    const assetResult = await downloadAssets(websiteSpec, generatedDir);
    await Promise.all([
        fs.writeFile(path.join(outputDir, "reconstruction-ir.json"), cleanSpec(reconstructionIR)),
        fs.writeFile(path.join(outputDir, "react-spec.json"), cleanSpec(reactSpec)),
        fs.writeFile(path.join(outputDir, "website-summary.json"), cleanSpec({
            metadata: websiteSpec.metadata,
            structure: websiteSpec.structure,
            design: websiteSpec.design,
            assets: websiteSpec.assets.images.map((image) => ({ src: image.src, currentSrc: image.currentSrc, width: image.width, height: image.height, renderedWidth: image.renderedWidth, renderedHeight: image.renderedHeight, semanticRole: image.semanticRole, local: image.local }))
        }))
    ]);
    await generateAppFile(reactSpec, websiteSpec);
    await generateMainFile();
    await generateStylesFile(reactSpec);
    await generateIndexFile(websiteSpec);
    await generatePackageFile();

    await fs.copyFile(path.join(generatedDir, "src", "App.jsx"), path.join(outputDir, "App.jsx"));
    await fs.copyFile(path.join(generatedDir, "src", "styles.css"), path.join(outputDir, "styles.css"));

    const buildProcess = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm run build"], {
        cwd: generatedDir, stdio: "inherit", windowsHide: true
    });
    const [buildExit] = await once(buildProcess, "exit");
    if (buildExit !== 0) throw new Error(`Generated site build failed (${buildExit}).`);

    const sourceMajorNodes = reconstructionIR.nodes.filter((node) => {
        const major = ["header", "main", "section", "footer"].includes(node.role);
        const heading = node.tag === "h1";
        const viewportSection = node.tag === "div" && node.box.y >= 120 && node.box.y < viewport.height && node.box.width >= viewport.width * 0.8 && node.box.height >= 350;
        const visibleMajor = major && node.box.y < viewport.height && node.box.y + node.box.height > 0;
        return (visibleMajor && node.box.width >= viewport.width * 0.65 && node.box.height >= 60) || (heading && node.box.y < viewport.height) || viewportSection;
    }).slice(0, 18);

    const hasBaseline = await Promise.all(["source-before.png", "generated-before.png"].map((file) => fs.access(path.join(outputDir, file)).then(() => true).catch(() => false)));
    const beforeDiff = hasBaseline.every(Boolean) ? compareScreenshots(
        path.join(outputDir, "source-before.png"),
        path.join(outputDir, "generated-before.png"),
        path.join(outputDir, "visual-diff-before.png")
    ) : null;

    const previewPort = 4182;
    previewProcess = spawn(process.execPath, [path.join(generatedDir, "node_modules", "vite", "bin", "vite.js"), "preview", "--host", "127.0.0.1", "--port", String(previewPort), "--strictPort"], {
        cwd: generatedDir, stdio: "ignore", windowsHide: true
    });
    const previewUrl = `http://127.0.0.1:${previewPort}`;
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
        try { const response = await fetch(previewUrl); if (response.ok) { ready = true; break; } } catch { /* startup wait */ }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error("Generated preview did not start.");

    const generatedPage = await browser.newPage({ viewport });
    await generatedPage.goto(previewUrl, { waitUntil: "networkidle", timeout: 30000 });
    await generatedPage.waitForSelector("[data-source-node]", { timeout: 10000 });
    await generatedPage.evaluate(() => document.fonts.ready);
    await generatedPage.waitForTimeout(700);
    await generatedPage.screenshot({ path: generatedPath, fullPage: false, type: "png" });
    const generatedNodes = await generatedPage.evaluate(() => Array.from(document.querySelectorAll("[data-source-node]"), (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const image = element.tagName === "IMG" ? { width: Math.round(rect.width), height: Math.round(rect.height), naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight, objectFit: style.objectFit } : null;
        return {
            id: element.getAttribute("data-source-node"), tag: element.tagName.toLowerCase(),
            text: (element.childElementCount ? "" : element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
            box: { x: Math.round(rect.x), y: Math.round(rect.y + scrollY), width: Math.round(rect.width), height: Math.round(rect.height) },
            typography: { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, color: style.color }, image
        };
    }));
    await generatedPage.close();

    const generatedById = new Map(generatedNodes.map((node) => [node.id, node]));
    const isDescendantOf = (node, ancestorId) => {
        let current = node;
        while (current?.parentId) {
            if (current.parentId === ancestorId) return true;
            current = reconstructionIR.nodes.find((candidate) => candidate.id === current.parentId);
        }
        return false;
    };
    const sections = sourceMajorNodes.map((source) => {
        const generated = generatedById.get(source.id) || null;
        const sourceImageNode = source.image ? source : reconstructionIR.nodes
            .filter((item) => item.image && isDescendantOf(item, source.id))
            .sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height)[0];
        const generatedImageNode = sourceImageNode ? generatedById.get(sourceImageNode.id) : null;
        const sourceImage = sourceImageNode ? { boundingBox: sourceImageNode.box, renderedWidth: sourceImageNode.box.width, renderedHeight: sourceImageNode.box.height, naturalWidth: sourceImageNode.image.naturalWidth, naturalHeight: sourceImageNode.image.naturalHeight, objectFit: sourceImageNode.image.objectFit } : null;
        const generatedImage = generatedImageNode?.image || null;
        const mismatch = generated ? {
            x: generated.box.x - source.box.x,
            y: generated.box.y - source.box.y,
            width: generated.box.width - source.box.width,
            height: generated.box.height - source.box.height
        } : { x: null, y: null, width: null, height: null };
        const cause = !generated ? "source node missing from generated React tree" :
            Math.abs(mismatch.y) > 32 ? "vertical flow or preceding section height differs" :
            Math.abs(mismatch.width) > 40 ? "container width or horizontal alignment differs" :
            Math.abs(mismatch.height) > 40 ? "content wrapping or vertical spacing differs" : "geometry is close";
        return {
            section: source.tag === "h1" ? "hero-heading" : source.role === "content" ? "content-section" : source.role,
            nodeId: source.id,
            source: { boundingBox: source.box, width: source.box.width, height: source.box.height, x: source.box.x, y: source.box.y, typography: source.typography, image: sourceImage },
            generated: generated ? { boundingBox: generated.box, width: generated.box.width, height: generated.box.height, x: generated.box.x, y: generated.box.y, typography: generated.typography, image: generatedImage } : null,
            mismatch,
            likelyCause: cause
        };
    });
    const afterDiff = compareScreenshots(sourcePath, generatedPath, path.join(outputDir, "visual-diff.png"), sourceMajorNodes.map((node) => ({ id: node.id, heading: node.text, position: { x: node.box.x, y: node.box.y }, size: { width: node.box.width, height: node.box.height } })));
    await fs.writeFile(path.join(outputDir, "generated-layout.json"), cleanSpec(generatedNodes));
    const report = {
        sourceUrl, viewport,
        baselineGlobalSimilarity: beforeDiff?.similarity ?? null,
        afterGlobalSimilarity: afterDiff.similarity,
        afterSectionScores: afterDiff.sections,
        extractedNodeCount: reconstructionIR.nodes.length,
        generatedNodeCount: generatedNodes.length,
        assetCount: assetResult.assets?.images?.length || websiteSpec.assets.images.length,
        downloadedImages: websiteSpec.assets.images.filter((image) => image.local).length,
        sections,
        firstMajorDivergence: sections.find((section) => section.likelyCause !== "geometry is close") || null
    };
    await fs.writeFile(path.join(outputDir, "diagnostic-report.json"), cleanSpec(report));
    console.log(JSON.stringify(report, null, 2));
} finally {
    if (previewProcess && !previewProcess.killed) previewProcess.kill();
    await browser.close();
}
