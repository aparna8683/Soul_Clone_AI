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
            text: getText(element)
        }));

        const images = Array.from(
            document.querySelectorAll("img")
        ).map((element) => ({
            src: element.src,
            alt: element.alt || null
        }));

        return {
            headings,
            paragraphs,
            links,
            buttons,
            images
        };
    });

    return data;
}