export async function captureScreenshot(page) {
    const screenshotPath = "screenshots/original.png";

    await page.screenshot({
        path: screenshotPath,
        fullPage: true
    });

    return screenshotPath;
}

export async function captureVisualScreenshot(page) {
    const screenshotPath = "screenshots/visual-desktop.jpg";

    await page.screenshot({
        path: screenshotPath,
        type: "jpeg",
        quality: 70,
        fullPage: false
    });

    return screenshotPath;
}
