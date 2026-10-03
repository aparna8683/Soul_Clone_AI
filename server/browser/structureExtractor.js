export async function extractStructure(page) {
    const structure = await page.evaluate(() => {
        const cleanText = (value = "") =>
            String(value).replace(/\s+/g, " ").trim();

        const isVisible = (element) => {
            const styles = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return (
                styles.display !== "none" &&
                styles.visibility !== "hidden" &&
                parseFloat(styles.opacity || "1") !== 0 &&
                rect.width > 0 &&
                rect.height > 0
            );
        };

        const getInfo = (element, headingText = null) => {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);

            const gridColumns =
                styles.gridTemplateColumns &&
                styles.gridTemplateColumns !== "none"
                    ? styles.gridTemplateColumns.split(" ").length
                    : null;

            return {
                tag: element.tagName.toLowerCase(),
                id: element.id || null,
                className:
                    typeof element.className === "string"
                        ? element.className.slice(0, 220)
                        : null,
                heading: headingText,
                position: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y + window.scrollY)
                },
                size: {
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                },
                backgroundColor: styles.backgroundColor,
                backgroundImage:
                    styles.backgroundImage !== "none"
                        ? styles.backgroundImage
                        : null,
                display: styles.display,
                positionType: styles.position,
                flexDirection: styles.flexDirection,
                gridColumns,
                borderRadius: styles.borderRadius,
                padding: styles.padding,
                gap: styles.gap,
                overflow: styles.overflow,
                color: styles.color
            };
        };

        const allImages = Array.from(document.querySelectorAll("img"))
            .map((img, assetIndex) => {
                const rect = img.getBoundingClientRect();
                const styles = window.getComputedStyle(img);

                return {
                    assetIndex,
                    src: img.currentSrc || img.src,
                    alt: img.alt || null,
                    x: Math.round(rect.x),
                    y: Math.round(rect.y + window.scrollY),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    naturalWidth: img.naturalWidth || null,
                    naturalHeight: img.naturalHeight || null,
                    area: Math.round(rect.width * rect.height),
                    objectFit: styles.objectFit,
                    visible:
                        isVisible(img) &&
                        rect.width > 20 &&
                        rect.height > 20
                };
            })
            .filter((image) => image.visible);

        const headingElements = Array.from(
            document.querySelectorAll("h1, h2")
        ).filter(isVisible);

        const candidates = [];

        for (const heading of headingElements) {
            let candidate = heading.parentElement;

            while (
                candidate &&
                candidate !== document.body &&
                candidate !== document.documentElement
            ) {
                const majorHeadings = candidate.querySelectorAll("h1, h2");

                if (majorHeadings.length > 1) {
                    break;
                }

                if (isVisible(candidate)) {
                    candidate = candidate.parentElement;
                } else {
                    break;
                }
            }

            if (candidate && candidate !== document.body) {
                candidates.push({
                    element: candidate,
                    headingText:
                        cleanText(heading.textContent).slice(0, 240) ||
                        null
                });
            }
        }

        const uniqueCandidates = [];

        for (const candidate of candidates) {
            if (
                !uniqueCandidates.some(
                    (item) => item.element === candidate.element
                )
            ) {
                uniqueCandidates.push(candidate);
            }
        }

        const viewportWidth = window.innerWidth;
        const documentHeight = document.documentElement.scrollHeight;

        const sections = uniqueCandidates
            .map((candidate, sectionIndex) => {
                const info = getInfo(
                    candidate.element,
                    candidate.headingText
                );

                candidate.element.setAttribute(
                    "data-soulclone-section",
                    String(sectionIndex)
                );

                const rect = candidate.element.getBoundingClientRect();
                const sectionArea = Math.max(
                    rect.width * rect.height,
                    1
                );

                const media = allImages
                    .map((image) => {
                        const centerX = image.x + image.width / 2;
                        const centerY =
                            image.y -
                            window.scrollY +
                            image.height / 2;

                        const inside =
                            centerX >= rect.x &&
                            centerX <= rect.right &&
                            centerY >= rect.y &&
                            centerY <= rect.bottom;

                        return { ...image, inside };
                    })
                    .filter(
                        (image) =>
                            image.inside &&
                            image.width > 40 &&
                            image.height > 40
                    )
                    .sort((a, b) => b.area - a.area)
                    .slice(0, 8)
                    .map((image) => ({
                        assetIndex: image.assetIndex,
                        alt: image.alt,
                        x: image.x,
                        y: image.y,
                        width: image.width,
                        height: image.height,
                        naturalWidth: image.naturalWidth,
                        naturalHeight: image.naturalHeight,
                        area: image.area,
                        role:
                            image.width > 700 ||
                            image.height > 450
                                ? "large-visual"
                                : image.width > 300
                                    ? "content-image"
                                    : "small-image"
                    }));

                // Detect large rendered visuals that are not normal <img>s.
                // This catches video/canvas/SVG/DOM product mockups and
                // gives the screenshot stage a stable target.
                const visualNodes = Array.from(
                    candidate.element.querySelectorAll(
                        "video, canvas, iframe, svg, [role='img'], [class*='mockup'], [class*='preview'], [class*='dashboard'], [class*='screenshot'], [class*='visual'], [class*='demo'], [data-testid*='visual']"
                    )
                )
                    .filter(isVisible)
                    .map((element, visualIndex) => {
                        const nodeRect =
                            element.getBoundingClientRect();
                        const styles =
                            window.getComputedStyle(element);
                        const className =
                            typeof element.className === "string"
                                ? element.className
                                : "";
                        const text = cleanText(
                            element.innerText || ""
                        );

                        const keywordMatch =
                            /mockup|preview|dashboard|screenshot|visual|demo|product|app|window/i.test(
                                className
                            );

                        const specialTag =
                            /^(video|canvas|iframe|svg)$/i.test(
                                element.tagName
                            );

                        const area =
                            nodeRect.width * nodeRect.height;

                        const score =
                            (specialTag ? 100 : 0) +
                            (keywordMatch ? 60 : 0) +
                            Math.min(
                                area / sectionArea,
                                0.8
                            ) *
                                100 +
                            (styles.backgroundImage !== "none"
                                ? 30
                                : 0) +
                            (text.length < 220 ? 20 : 0);

                        element.setAttribute(
                            "data-soulclone-visual",
                            `${sectionIndex}-${visualIndex}`
                        );

                        return {
                            selector:
                                `[data-soulclone-visual="${sectionIndex}-${visualIndex}"]`,
                            tag: element.tagName.toLowerCase(),
                            className: className.slice(0, 220),
                            x: Math.round(nodeRect.x),
                            y: Math.round(
                                nodeRect.y + window.scrollY
                            ),
                            width: Math.round(nodeRect.width),
                            height: Math.round(nodeRect.height),
                            area: Math.round(area),
                            score: Math.round(score),
                            hasBackgroundImage:
                                styles.backgroundImage !==
                                "none",
                            textLength: text.length
                        };
                    })
                    .filter(
                        (visual) =>
                            visual.width >= 180 &&
                            visual.height >= 120 &&
                            visual.area <= sectionArea * 0.95
                    )
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3);

                return {
                    ...info,
                    sectionIndex,
                    selector:
                        `[data-soulclone-section="${sectionIndex}"]`,
                    media,
                    visualNodes
                };
            })
            .filter((section) => {
                const isTooLarge =
                    section.size.height >
                    documentHeight * 0.8;
                const isTooSmall = section.size.height < 80;
                const isPageWrapper =
                    section.id === "__next" ||
                    section.tag === "body" ||
                    section.tag === "html";

                return (
                    section.size.width >=
                        viewportWidth * 0.5 &&
                    !isTooLarge &&
                    !isTooSmall &&
                    !isPageWrapper
                );
            });

        const landmarks = Array.from(
            document.querySelectorAll(
                "header, nav, footer, aside"
            )
        )
            .filter(isVisible)
            .map((element) => getInfo(element));

        const visualBlocks = Array.from(
            document.querySelectorAll(
                "main > *, [role='main'] > *"
            )
        )
            .filter(isVisible)
            .map((element) => getInfo(element))
            .filter(
                (block) =>
                    block.size.width >= viewportWidth * 0.65 &&
                    block.size.height >= 120
            )
            .slice(0, 30);

        return {
            sections,
            landmarks,
            visualBlocks
        };
    });

    return structure;
}
