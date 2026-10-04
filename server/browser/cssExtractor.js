export async function extractStyles(page) {
    const styles = await page.evaluate(() => {

        const getStyles = (element) => {
            const computed = window.getComputedStyle(element);

            const backgroundImage =
                computed.backgroundImage !== "none"
                    ? computed.backgroundImage
                    : null;
            const clipToText =
                computed.webkitBackgroundClip === "text" ||
                computed.backgroundClip === "text";

            // The paint color of gradient text lives in the background
            // gradient, not in `color` (which is often a misleading fallback
            // or fully transparent). Use the gradient's first color stop as
            // the representative color and flag the element so consumers can
            // reproduce the actual gradient.
            const fillColor =
                computed.webkitTextFillColor &&
                computed.webkitTextFillColor !== "currentcolor"
                    ? computed.webkitTextFillColor
                    : computed.color;
            const isTransparent = /^rgba?\([^)]*,\s*0\s*\)\s*$/i.test(
                String(fillColor)
            );

            let color = fillColor;
            if (clipToText && backgroundImage && /gradient\(/i.test(backgroundImage)) {
                const stop = backgroundImage.match(
                    /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/i
                );
                color = stop ? stop[0] : fillColor;
            } else if (isTransparent) {
                color = null;
            }

            return {
                tag: element.tagName.toLowerCase(),

                color,

                backgroundColor: computed.backgroundColor,

                backgroundImage,
                backgroundClipText: clipToText,

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