import { runAI } from "./groq.js";

export async function analyzeWebsiteWithAI(websiteSpec) {

const aiInput = {
    page: {
        url: websiteSpec.metadata.url,
        title: websiteSpec.metadata.title
    },

    headings: websiteSpec.content.headings
        .slice(0, 15)
        .map((heading) => heading.text)
        .filter(Boolean),

    paragraphs: websiteSpec.content.paragraphs
        .slice(0, 8)
        .map((paragraph) => paragraph.slice(0, 180)),

    buttons: websiteSpec.content.buttons
        .slice(0, 10)
        .map((button) => button.text)
        .filter(Boolean),

    links: websiteSpec.content.links
        .slice(0, 15)
        .map((link) => link.text)
        .filter(Boolean),

    textBlocks: websiteSpec.content.textBlocks
        ? websiteSpec.content.textBlocks.slice(0, 12)
        : [],

    controls: websiteSpec.content.controls
        ? websiteSpec.content.controls.slice(0, 8)
        : [],

    landmarks: (websiteSpec.structure.landmarks || [])
        .slice(0, 8)
        .map((landmark) => ({
            tag: landmark.tag,
            className: landmark.className,
            width: landmark.size?.width,
            height: landmark.size?.height,
            y: landmark.position?.y
        })),

    sections: websiteSpec.structure.sections
.slice(0, 10)
        .map((section) => ({
            tag: section.tag,
            heading: section.heading || null,
            width: section.size?.width,
            height: section.size?.height,
            y: section.position?.y,
            background: section.backgroundColor,
            display: section.display,
            flexDirection: section.flexDirection,
            media: (section.media || []).map((media) => ({
                assetId: `img-${media.assetIndex}`,
                width: media.width,
                height: media.height,
                role: media.role
            }))
        })),

    visualBlocks: (websiteSpec.structure.visualBlocks || [])
.slice(0, 12)
        .map((block) => ({
            tag: block.tag,
            className: block.className,
            x: block.position?.x,
            y: block.position?.y,
            width: block.size?.width,
            height: block.size?.height,
            background: block.backgroundColor,
            display: block.display
        })),

    images: websiteSpec.assets.images
 .slice(0, 12)
        .map((image) => ({
            alt: image.alt,
            width: image.width,
            height: image.height
        })),

    design: {
        body: websiteSpec.design.styles?.body
            ? {
                  fontFamily: websiteSpec.design.styles.body.fontFamily,
                  color: websiteSpec.design.styles.body.color,
                  backgroundColor:
                      websiteSpec.design.styles.body.backgroundColor
              }
            : null,

        h1: websiteSpec.design.styles?.h1
            ? {
                  fontSize: websiteSpec.design.styles.h1.fontSize,
                  fontWeight: websiteSpec.design.styles.h1.fontWeight,
                  color: websiteSpec.design.styles.h1.color
              }
            : null,

        h2: websiteSpec.design.styles?.h2
            ? {
                  fontSize: websiteSpec.design.styles.h2.fontSize,
                  fontWeight: websiteSpec.design.styles.h2.fontWeight,
                  color: websiteSpec.design.styles.h2.color
              }
            : null
    },

    visualAnalysis: websiteSpec.visualAnalysis || null,

    responsive: {
        desktop: {
            width: websiteSpec.responsive.desktop.viewport.width,
            overflow:
                websiteSpec.responsive.desktop.hasHorizontalOverflow
        },

        tablet: {
            width: websiteSpec.responsive.tablet.viewport.width,
            overflow:
                websiteSpec.responsive.tablet.hasHorizontalOverflow
        },

        mobile: {
            width: websiteSpec.responsive.mobile.viewport.width,
            overflow:
                websiteSpec.responsive.mobile.hasHorizontalOverflow
        }
    }
};

    const prompt = `
You are a frontend architecture analyst.

Analyze the provided website information and identify the
main reusable UI components needed to recreate the website.

Do NOT generate React code.

Return ONLY valid JSON.

Use exactly this structure:

{
    "pageType": "string",
    "components": [
        {
            "name": "string",
            "purpose": "string",
            "priority": "high | medium | low"
        }
    ]
}

Rules:

1. Identify the major visual sections of the page.
2. Give priority to the visualAnalysis blueprint when it conflicts with weak DOM heuristics.
3. Identify reusable UI components.
4. Infer the page type from the provided information.
5. Large images and visualBlocks are first-class layout evidence; do not reduce them to generic cards.
6. Use headings, buttons, links, text blocks, controls, sections, visualBlocks and images as evidence.
7. Treat repeated text blocks as possible cards, lists, categories, filters or navigation content.
8. Create components such as ProductShowcase, FeatureSplit, LogoCloud or Testimonial when the evidence supports them.
9. Do not invent unnecessary components.
10. Do not reproduce every HTML element.
11. Keep the component list concise.
9. Return valid JSON only.

Website information:

${JSON.stringify(aiInput)}
`;

    console.log(
        "📦 AI input size:",
        JSON.stringify(aiInput).length,
        "characters"
    );

    const response = await runAI(prompt, {
        temperature: 0.2,
        max_completion_tokens: 900,
        response_format: { type: "json_object" }
    });

    return JSON.parse(response);
}