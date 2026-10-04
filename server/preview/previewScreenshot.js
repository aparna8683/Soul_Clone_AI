import { chromium } from "playwright";

export async function captureGeneratedScreenshot(previewUrl) {
    const browser = await chromium.launch({ headless: true });

    try {
        const page = await browser.newPage({
            viewport: {
                width: 1440,
                height: 900
            }
        });

        await page.goto(previewUrl, {
            waitUntil: "networkidle",
            timeout: 20000
        }).catch(async (error) => {
            if (error.name === "TimeoutError") {
                console.warn("⚠️ Generated preview load timed out; capturing current page.");
            } else {
                throw error;
            }
        });

        await page.evaluate(() => document.fonts.ready).catch(() => {});
        await page.waitForTimeout(1000);

        const viewportPath = "screenshots/generated.png";
        const fullPagePath = "screenshots/generated-full.png";

        await page.screenshot({
            path: viewportPath,
            fullPage: false
        });

        await page.screenshot({
            path: fullPagePath,
            fullPage: true
        });

        return { viewport: viewportPath, fullPage: fullPagePath };
    } finally {
        await browser.close();
    }
}
