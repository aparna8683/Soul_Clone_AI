export async function extractAssets(page) {
    const assets = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll("img")).filter((img) => {
            const rect = img.getBoundingClientRect();
            const styles = getComputedStyle(img);
            return rect.width > 1 && rect.height > 1 && styles.display !== "none" && styles.visibility !== "hidden" && Number(styles.opacity) !== 0;
        }).map((img, index) => {
            const rect = img.getBoundingClientRect();
            const styles = getComputedStyle(img);
            const parentText = img.parentElement?.innerText?.replace(/\\s+/g, " ").trim() || "";
            const source = img.currentSrc || img.src || "";
            const alt = img.alt || "";
            const className = typeof img.className === "string" ? img.className : "";

            const aspectRatio =
                img.naturalWidth && img.naturalHeight
                    ? Number((img.naturalWidth / img.naturalHeight).toFixed(2))
                    : null;

            const looksLikeAvatar =
                aspectRatio !== null &&
                aspectRatio >= 0.75 &&
                aspectRatio <= 1.33 &&
                (
                    alt.toLowerCase().includes("avatar") ||
                    alt.toLowerCase().includes("profile") ||
                    className.toLowerCase().includes("avatar") ||
                    className.toLowerCase().includes("author") ||
                    source.toLowerCase().includes("avatar") ||
                    source.toLowerCase().includes("headshot")
                );

            const looksLikeLogo =
                aspectRatio !== null &&
                (
                    source.toLowerCase().includes("logo") ||
                    alt.toLowerCase().includes("logo") ||
                    className.toLowerCase().includes("logo")
                );

            return {
                type: "image",
                index,
                src: source,
                alt: alt || null,
                width: img.naturalWidth,
                height: img.naturalHeight,
                renderedWidth: Math.round(rect.width),
                renderedHeight: Math.round(rect.height),
                x: Math.round(rect.x),
                y: Math.round(rect.y + scrollY),
                currentSrc: img.currentSrc || null,
                objectFit: styles.objectFit,
                objectPosition: styles.objectPosition,
                visible: true,
                aspectRatio,
                area: Math.round(rect.width * rect.height),
                parentText: parentText.slice(0, 180),
                className: className.slice(0, 180),
                semanticRole: looksLikeAvatar
                    ? "avatar"
                    : looksLikeLogo
                        ? "logo"
                        : /icon|symbol/i.test(`${alt} ${className} ${source}`)
                            ? "icon"
                            : rect.width >= innerWidth * 0.45 || rect.height >= 320
                                ? "hero-image"
                                : img.naturalWidth >= 700 || img.naturalHeight >= 450
                                    ? "product-screenshot"
                                    : "content-image"
            };
        });

        const links = Array.from(
            document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
        ).map((link) => ({
            type: "favicon",
            src: link.href
        }));

        const backgroundImages = [];

        const allElements = document.querySelectorAll("*");

        allElements.forEach((element) => {
            const styles = window.getComputedStyle(element);
            const backgroundImage = styles.backgroundImage;

            if (
                backgroundImage &&
                backgroundImage !== "none" &&
                backgroundImage.includes("url(")
            ) {
                backgroundImages.push({
                    type: "background-image",
                    src: backgroundImage,
                    tag: element.tagName.toLowerCase(),
                    x: Math.round(element.getBoundingClientRect().x),
                    y: Math.round(element.getBoundingClientRect().y + scrollY),
                    width: Math.round(element.getBoundingClientRect().width),
                    height: Math.round(element.getBoundingClientRect().height)
                });
            }
        });

        return {
            images,
            icons: links,
            backgroundImages: backgroundImages.slice(0, 40)
        };
    });

    return assets;
}
