export function buildWebsiteSpec({
    url,
    title,
    dom,
    structure,
    styles,
    assets,
    screenshot,
    visualScreenshot,
    responsive,
    visualAnalysis
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
            buttons: dom.buttons,
            textBlocks: dom.textBlocks || [],
            controls: dom.controls || []
        },

        structure: {
            sections: structure.sections,
            landmarks: structure.landmarks || []
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
        visualScreenshot,

        responsive,
        visualAnalysis: visualAnalysis || null
    };
}