export async function captureScreenshot(page) {
    const screenshotPath = "screenshots/original.png";

    await page.screenshot({
        path: screenshotPath,
        fullPage: true
    });

    return screenshotPath;
}

export async function captureVisualScreenshot(page) {
    const screenshotPath = "screenshots/visual-desktop.png";

    await page.screenshot({
        path: screenshotPath,
        type: "png",
        fullPage: false,
        scale: "css"
    });

    return screenshotPath;
}
