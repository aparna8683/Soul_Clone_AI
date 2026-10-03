export async function extractStructure(page) {
    const structure = await page.evaluate(() => {
        const isVisible = (element) => {
            const styles = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
                styles.display !== "none" &&
                styles.visibility !== "hidden" &&
                parseFloat(styles.opacity) !== 0 &&
                rect.width > 0 &&
                rect.height > 0
            );
        };

        const cleanText = (value = "") => value.replace(/\\s+/g, " ").trim();

        const getInfo = (element, headingText = null) => {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);

            const gridColumns = styles.gridTemplateColumns
                ? styles.gridTemplateColumns.split(" ").length
                : null;

            return {
                tag: element.tagName.toLowerCase(),
                id: element.id || null,
                className:
                    typeof element.className === "string"
                        ? element.className
                        : null,
                heading: headingText,
                position: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y)
                },
                size: {
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                },
                backgroundColor: styles.backgroundColor,
                backgroundImage: styles.backgroundImage !== "none"
                    ? styles.backgroundImage
                    : null,
                display: styles.display,
                positionType: styles.position,
                flexDirection: styles.flexDirection,
                gridColumns,
                borderRadius: styles.borderRadius,
                padding: styles.padding,
                gap: styles.gap
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
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    naturalWidth: img.naturalWidth || null,
                    naturalHeight: img.naturalHeight || null,
                    area: Math.round(rect.width * rect.height),
                    objectFit: styles.objectFit,
                    visible: isVisible(img) && rect.width > 20 && rect.height > 20
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
                    headingText: cleanText(heading.textContent).slice(0, 200) || null
                });
            }
        }

        const uniqueCandidates = [];
        for (const candidate of candidates) {
            if (!uniqueCandidates.some((item) => item.element === candidate.element)) {
                uniqueCandidates.push(candidate);
            }
        }

        const viewportWidth = window.innerWidth;
        const documentHeight = document.documentElement.scrollHeight;

        const sections = uniqueCandidates
            .map((candidate) => {
                const info = getInfo(candidate.element, candidate.headingText);
                const rect = candidate.element.getBoundingClientRect();

                const media = allImages
                    .map((image) => {
                        const centerX = image.x + image.width / 2;
                        const centerY = image.y + image.height / 2;
                        const inside =
                            centerX >= rect.x &&
                            centerX <= rect.right &&
                            centerY >= rect.y &&
                            centerY <= rect.bottom;

                        const distance = Math.abs(
                            centerY - (rect.y + rect.height / 2)
                        );

                        return { ...image, inside, distance };
                    })
                    .filter((image) => image.inside && image.width > 40 && image.height > 40)
                    .sort((a, b) => b.area - a.area)
                    .slice(0, 6)
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
                            image.width > 700 || image.height > 450
                                ? "large-visual"
                                : image.width > 300
                                    ? "content-image"
                                    : "small-image"
                    }));

                return {
                    ...info,
                    media
                };
            })
            .filter((section) => {
                const isTooLarge = section.size.height > documentHeight * 0.8;
                const isTooSmall = section.size.height < 80;
                const isPageWrapper =
                    section.id === "__next" ||
                    section.tag === "body" ||
                    section.tag === "html";

                return (
                    section.size.width >= viewportWidth * 0.5 &&
                    !isTooLarge &&
                    !isTooSmall &&
                    !isPageWrapper
                );
            });

        const landmarks = Array.from(
            document.querySelectorAll("header, nav, footer, aside")
        )
            .filter(isVisible)
            .map((element) => getInfo(element));

        const visualBlocks = Array.from(
            document.querySelectorAll("main > *, [role='main'] > *")
        )
            .filter(isVisible)
            .map((element) => getInfo(element))
            .filter((block) => block.size.width >= viewportWidth * 0.65 && block.size.height >= 120)
            .slice(0, 30);

        return {
            sections,
            landmarks,
            visualBlocks
        };
    });

    return structure;
}
