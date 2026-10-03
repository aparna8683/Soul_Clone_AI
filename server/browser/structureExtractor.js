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

        const getInfo = (element, headingText = null) => {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);

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
                display: styles.display,
                positionType: styles.position
            };
        };

        /*
         * Find the visual container around each H1/H2.
         *
         * We move upward through the DOM while the container
         * still contains only one major heading.
         *
         * When another H1/H2 appears, we stop.
         */
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

                const majorHeadings =
                    candidate.querySelectorAll("h1, h2");

                /*
                 * If this container contains another major heading,
                 * it is probably a parent containing multiple sections.
                 */
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
                const headingText =
                    heading.textContent?.trim().slice(0, 200) || null;

                candidates.push({
                    element: candidate,
                    headingText
                });
            }
        }

        /*
         * Remove duplicate containers.
         */
        const uniqueCandidates = [];

        for (const candidate of candidates) {
            const alreadyExists = uniqueCandidates.some(
                (item) => item.element === candidate.element
            );

            if (!alreadyExists) {
                uniqueCandidates.push(candidate);
            }
        }

        /*
         * Convert containers into useful section information.
         */
        const sections = uniqueCandidates
            .map((candidate) =>
                getInfo(candidate.element, candidate.headingText)
            )
            .filter((section) => {

                const viewportWidth = window.innerWidth;
                const documentHeight =
                    document.documentElement.scrollHeight;

                const isTooLarge =
                    section.size.height > documentHeight * 0.8;

                const isTooSmall =
                    section.size.height < 80;

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

        /*
         * Extract important page landmarks separately.
         */
        const landmarks = Array.from(
            document.querySelectorAll(
                "header, nav, footer, aside"
            )
        )
            .filter(isVisible)
            .map((element) => getInfo(element));

        return {
            sections,
            landmarks
        };
    });

    return structure;
}