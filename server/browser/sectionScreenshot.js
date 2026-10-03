import fs from "fs/promises";
import path from "path";

function safeFileName(value) {
    return String(value || "section")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "section";
}

export async function captureSectionEvidence(
    page,
    sections = [],
    outputDir = "screenshots/sections"
) {
    await fs.mkdir(outputDir, { recursive: true });

    const evidence = [];

    for (const section of sections.slice(0, 12)) {
        const index = section.sectionIndex;
        const heading = section.heading || \`section-\${index + 1}\`;
        const baseName = \`\${String(index + 1).padStart(2, "0")}-\${safeFileName(heading)}\`;

        try {
            const locator = page.locator(section.selector).first();

            if (!(await locator.count())) {
                continue;
            }

            const sectionPath = path.join(
                outputDir,
                \`\${baseName}.png\`
            );

            await locator.screenshot({
                path: sectionPath,
                type: "png"
            });

            const visuals = [];

            for (
                const visual of (section.visualNodes || []).slice(0, 2)
            ) {
                try {
                    const visualLocator = page
                        .locator(visual.selector)
                        .first();

                    if (!(await visualLocator.count())) {
                        continue;
                    }

                    const visualPath = path.join(
                        outputDir,
                        \`\${baseName}-visual-\${visuals.length + 1}.png\`
                    );

                    await visualLocator.screenshot({
                        path: visualPath,
                        type: "png"
                    });

                    visuals.push({
                        path: visualPath,
                        selector: visual.selector,
                        tag: visual.tag,
                        className: visual.className,
                        width: visual.width,
                        height: visual.height,
                        score: visual.score
                    });
                } catch (error) {
                    console.warn(
                        \`⚠️ Could not capture visual for section \${index}:\`,
                        error.message
                    );
                }
            }

            evidence.push({
                sectionIndex: index,
                heading,
                path: sectionPath,
                width: section.size?.width || null,
                height: section.size?.height || null,
                visuals
            });
        } catch (error) {
            console.warn(
                \`⚠️ Could not capture section \${index}:\`,
                error.message
            );
        }
    }

    console.log(
        \`🧩 Section evidence captured: \${evidence.length}/\${Math.min(sections.length, 12)}\`
    );

    return evidence;
}
