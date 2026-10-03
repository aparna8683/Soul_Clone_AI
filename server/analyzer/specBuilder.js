export function buildWebsiteSpec({
    url,
    title,
    dom,
    structure,
    styles,
    assets,
    screenshot,
    responsive
}) {
    return {
        metadata: {
            url,
            title
        },

        content: {
            headings: dom.headings,
            paragraphs: dom.paragraphs,
            links: dom.links,
            buttons: dom.buttons
        },

        structure: {
            sections: structure.sections
        },

        design: {
            styles
        },

        assets: {
            images: assets.images,
            icons: assets.icons,
            backgroundImages: assets.backgroundImages
        },

        screenshot,

        responsive 
    };
}