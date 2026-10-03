export async function captureScreenshot(page) {
    const screenshotPath = "screenshots/original.png";

    await page.screenshot({
        path: screenshotPath,
        fullPage: true
    });

    return screenshotPath;
}