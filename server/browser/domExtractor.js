export async function extractDOM(page) {
    const data = await page.evaluate(() => {

        const getText = (element) => {
            return element?.textContent?.trim() || null;
        };

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
        .map((element) => ({
            text: getText(element),
            url: element.href || null
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