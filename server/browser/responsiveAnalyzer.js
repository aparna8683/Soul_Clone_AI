export async function analyzeResponsive(page) {
    const viewports = [
        {
            name: "desktop",
            width: 1440,
            height: 900
        },
        {
            name: "tablet",
            width: 768,
            height: 1024
        },
        {
            name: "mobile",
            width: 390,
            height: 844
        }
    ];

    const responsive = {};

    for (const viewport of viewports) {
        await page.setViewportSize({
            width: viewport.width,
            height: viewport.height
        });

        await page.waitForTimeout(500);

        const data = await page.evaluate(() => {
            const getElementInfo = (element) => {
                const rect = element.getBoundingClientRect();
                const styles = window.getComputedStyle(element);

                return {
                    tag: element.tagName.toLowerCase(),
                    className:
                        typeof element.className === "string"
                            ? element.className
                            : null,

                    text:
                        element.textContent?.trim().slice(0, 100) || null,

                    width: Math.round(rect.width),
                    height: Math.round(rect.height),

                    display: styles.display,
                    position: styles.position
                };
            };

            const elements = Array.from(
                document.querySelectorAll(
                    "header, nav, main, section, article, footer, button"
                )
            ).map(getElementInfo);

            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },

                documentWidth: document.documentElement.scrollWidth,

                hasHorizontalOverflow:
                    document.documentElement.scrollWidth >
                    window.innerWidth,

                elements
            };
        });

        responsive[viewport.name] = data;
    }

    return responsive;
}