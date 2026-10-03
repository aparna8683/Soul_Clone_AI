export async function extractStyles(page) {
    const styles = await page.evaluate(() => {

        const getStyles = (element) => {
            const computed = window.getComputedStyle(element);

            return {
                tag: element.tagName.toLowerCase(),

                color: computed.color,

                backgroundColor: computed.backgroundColor,

                fontFamily: computed.fontFamily,

                fontSize: computed.fontSize,

                fontWeight: computed.fontWeight,

                lineHeight: computed.lineHeight,

                letterSpacing: computed.letterSpacing,

                margin: computed.margin,

                padding: computed.padding,

                borderRadius: computed.borderRadius,

                display: computed.display,

                position: computed.position
            };
        };

        const selectors = [
            "body",
            "header",
            "nav",
            "main",
            "section",
            "h1",
            "h2",
            "p",
            "a",
            "button",
            "img",
            "footer"
        ];

        const result = {};

        for (const selector of selectors) {
            const element = document.querySelector(selector);

            if (element) {
                result[selector] = getStyles(element);
            }
        }

        return result;
    });

    return styles;
}