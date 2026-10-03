export async function extractDOM(page) {
    const data = await page.evaluate(() => {

        const getText = (element) => {
            return element?.textContent?.trim() || null;
        };

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

        const brandCandidates = Array.from(
            document.querySelectorAll("header a, nav a, a[aria-label], a[title]")
        )
            .filter(isVisible)
            .map((element) => ({
                text: getText(element),
                ariaLabel: element.getAttribute("aria-label"),
                title: element.getAttribute("title"),
                alt: element.querySelector("img")?.alt || null
            }))
            .filter((item) => item.text || item.ariaLabel || item.title || item.alt);

        const brandName =
            brandCandidates[0]?.text ||
            brandCandidates[0]?.ariaLabel ||
            brandCandidates[0]?.title ||
            brandCandidates[0]?.alt ||
            null;

        const headings = Array.from(
            document.querySelectorAll("h1, h2, h3, h4, h5, h6")
        ).map((element) => ({
            tag: element.tagName.toLowerCase(),
            text: getText(element)
        }));

        const paragraphs = Array.from(
            document.querySelectorAll("p")
        ).map((element) => getText(element))
        .filter(Boolean);

        const links = Array.from(
            document.querySelectorAll("a")
        ).map((element) => ({
            text: getText(element),
            href: element.href
        }));

        const buttons = Array.from(
            document.querySelectorAll("button, a")
        )
        .filter((element) => {
            const role = element.getAttribute("role");
            const className = element.className?.toString().toLowerCase() || "";

            return (
                element.tagName.toLowerCase() === "button" ||
                role === "button" ||
                className.includes("button") ||
                className.includes("btn")
            );
        })
        .map((element) => {
            const rect = element.getBoundingClientRect();

            return {
                text: getText(element),
                url: element.href || null,
                x: Math.round(rect.x),
                y: Math.round(rect.y + window.scrollY),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
        }));

        const images = Array.from(
            document.querySelectorAll("img")
        ).map((element) => ({
            src: element.currentSrc || element.src,
            alt: element.alt || null,
            width: element.naturalWidth || null,
            height: element.naturalHeight || null
        }));

        // Capture visible non-heading text that often contains important
        // card/list content (city names, categories, labels, etc.).
        const textBlocks = Array.from(
            document.querySelectorAll("li, [role='listitem'], [role='heading'], div, span")
        )
            .filter(isVisible)
            .map((element) => getText(element))
            .filter((text) => text && text.length >= 2 && text.length <= 120)
            .filter((text, index, all) => all.indexOf(text) === index)
            .slice(0, 80);

        const controls = Array.from(
            document.querySelectorAll("input, textarea, select")
        )
            .filter(isVisible)
            .map((element) => ({
                type: element.tagName.toLowerCase(),
                placeholder: element.getAttribute("placeholder"),
                ariaLabel: element.getAttribute("aria-label"),
                value: element.value || null
            }));

        return {
            brandName,
            headings,
            paragraphs,
            links,
            buttons,
            images,
            textBlocks,
            controls
        };
    });

    return data;
}