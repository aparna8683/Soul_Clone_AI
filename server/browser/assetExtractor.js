export async function extractAssets(page) {
    const assets = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll("img")).map((img, index) => {
            const rect = img.getBoundingClientRect();
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
                aspectRatio,
                area: Math.round(rect.width * rect.height),
                parentText: parentText.slice(0, 180),
                className: className.slice(0, 180),
                semanticRole: looksLikeAvatar
                    ? "avatar"
                    : looksLikeLogo
                        ? "logo"
                        : img.naturalWidth >= 700 || img.naturalHeight >= 450
                            ? "large-visual"
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
                    src: backgroundImage
                });
            }
        });

        return {
            images,
            icons: links,
            backgroundImages
        };
    });

    return assets;
}