import fs from "fs/promises";
import path from "path";

function extensionFromContentType(contentType = "") {
    if (contentType.includes("png")) return "png";
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("gif")) return "gif";
    if (contentType.includes("svg")) return "svg";
    return "jpg";
}

export async function downloadAssets(websiteSpec, generatedDir) {
    const images = websiteSpec?.assets?.images || [];
    const assetsDir = path.join(generatedDir, "public", "assets");

    await fs.mkdir(assetsDir, { recursive: true });

    let downloaded = 0;

    for (let index = 0; index < Math.min(images.length, 20); index++) {
        const image = images[index];

        if (!image?.src || !/^https?:\/\//i.test(image.src)) {
            continue;
        }

        try {
            const response = await fetch(image.src, {
                signal: AbortSignal.timeout(10000),
                headers: {
                    "User-Agent": "SoulClone-AI/1.0"
                }
            });

            if (!response.ok) {
                continue;
            }

            const contentType = response.headers.get("content-type") || "";

            if (!contentType.startsWith("image/")) {
                continue;
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            const extension = extensionFromContentType(contentType);
            const fileName = `asset-${index}.${extension}`;
            const filePath = path.join(assetsDir, fileName);

            await fs.writeFile(filePath, buffer);

            image.src = `/assets/${fileName}`;
            image.local = true;
            downloaded++;
        } catch (error) {
            console.warn(`⚠️ Could not download image ${index}:`, error.message);
        }
    }

    console.log(`🖼️ Local assets prepared: ${downloaded}/${Math.min(images.length, 20)}`);

    return websiteSpec;
}
