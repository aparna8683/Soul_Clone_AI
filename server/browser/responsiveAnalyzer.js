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

                    x: Math.round(rect.x),
                    y: Math.round(rect.y + window.scrollY),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),

                    display: styles.display,
                    position: styles.position,
                    flexDirection: styles.flexDirection,
                    gridTemplateColumns: styles.gridTemplateColumns,
                    gap: styles.gap,
                    padding: styles.padding,
                    margin: styles.margin,
                    fontFamily: styles.fontFamily,
                    fontSize: styles.fontSize,
                    fontWeight: styles.fontWeight,
                    lineHeight: styles.lineHeight,
                    color: styles.color,
                    backgroundColor: styles.backgroundColor,
                    backgroundImage: styles.backgroundImage !== "none" ? styles.backgroundImage : null,
                    borderRadius: styles.borderRadius,
                    objectFit: styles.objectFit || null,
                    parentTag: element.parentElement?.tagName.toLowerCase() || null
                };
            };

            const elements = Array.from(
                document.querySelectorAll(
                    "header, nav, main, section, article, footer, button"
                )
            ).filter((element) => {
                const rect = element.getBoundingClientRect();
                const styles = window.getComputedStyle(element);
                return rect.width > 1 && rect.height > 1 && styles.display !== "none" && styles.visibility !== "hidden" && Number(styles.opacity) !== 0;
            }).slice(0, 120).map(getElementInfo);

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
