import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("https://linear.app/", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);
    const probes = await page.evaluate(() => {
        const results = [];
        for (const el of document.querySelectorAll("body *")) {
            const s = getComputedStyle(el);
            const bg = s.backgroundImage;
            if (!bg || bg === "none" || !bg.includes("url(")) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 50 || r.height < 50) continue;
            results.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 60),
                box: { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
                position: s.position, zIndex: s.zIndex, opacity: s.opacity,
                backgroundSize: s.backgroundSize, backgroundRepeat: s.backgroundRepeat,
                backgroundPosition: s.backgroundPosition, backgroundBlendMode: s.backgroundBlendMode,
                mixBlendMode: s.mixBlendMode, backgroundAttachment: s.backgroundAttachment,
                backgroundImage: bg.slice(0, 140)
            });
            if (results.length >= 12) break;
        }
        return results;
    });
    console.log(JSON.stringify(probes, null, 2));
} finally {
    await browser.close();
}
