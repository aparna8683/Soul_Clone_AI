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
    visualAnalysis,
    sectionEvidence = []
}) {
    return {
        metadata: {
            url,
            title,
            brandName: dom.brandName || null
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
            landmarks: structure.landmarks || [],
            visualBlocks: structure.visualBlocks || []
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
        sectionEvidence,

        responsive,
        visualAnalysis: visualAnalysis || null
    };
}
