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
        ? websiteSpec.content.textBlocks.slice(0, 40)
        : [],

    controls: websiteSpec.content.controls
        ? websiteSpec.content.controls.slice(0, 12)
        : [],

    sections: websiteSpec.structure.sections
        .slice(0, 12)
        .map((section) => ({
            tag: section.tag,
            heading: section.heading || null,
            width: section.size?.width,
            height: section.size?.height,
            y: section.position?.y,
            background: section.backgroundColor
        })),

    images: websiteSpec.assets.images
        .slice(0, 8)
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
2. Identify reusable UI components.
3. Infer the page type from the provided information.
4. Use headings, buttons, links, text blocks, controls, sections and images as evidence.
5. Treat repeated text blocks as possible cards, lists, categories, filters or navigation content.
6. Do not invent unnecessary components.
7. Do not reproduce every HTML element.
8. Keep the component list concise.
9. Return valid JSON only.

Website information:

${JSON.stringify(aiInput)}
`;

    console.log(
        "📦 AI input size:",
        JSON.stringify(aiInput).length,
        "characters"
    );

    const response = await runAI(prompt);

    return JSON.parse(response);
}