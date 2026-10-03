export async function extractAssets(page) {
    const assets = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll("img")).map((img) => ({
            type: "image",
            src: img.src,
            alt: img.alt || null,
            width: img.naturalWidth,
            height: img.naturalHeight
        }));

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