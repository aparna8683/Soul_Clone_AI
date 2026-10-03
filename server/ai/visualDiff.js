import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

function readPng(filePath) {
    return PNG.sync.read(fs.readFileSync(filePath));
}

export function compareScreenshots(
    originalPath,
    generatedPath,
    diffPath = "screenshots/visual-diff.png"
) {
    const original = readPng(originalPath);
    const generated = readPng(generatedPath);

    if (
        original.width !== generated.width ||
        original.height !== generated.height
    ) {
        return {
            comparable: false,
            diffPixels: null,
            diffRatio: 1,
            similarity: 0,
            width: original.width,
            height: original.height,
            generatedWidth: generated.width,
            generatedHeight: generated.height,
            diffPath: null,
            reason: "Screenshot dimensions do not match."
        };
    }

    const diff = new PNG({
        width: original.width,
        height: original.height
    });

    const diffPixels = pixelmatch(
        original.data,
        generated.data,
        diff.data,
        original.width,
        original.height,
        {
            threshold: 0.1,
            includeAA: false
        }
    );

    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    const totalPixels = original.width * original.height;

    return {
        comparable: true,
        diffPixels,
        totalPixels,
        diffRatio: Number((diffPixels / totalPixels).toFixed(4)),
        similarity: Number((1 - diffPixels / totalPixels).toFixed(4)),
        width: original.width,
        height: original.height,
        diffPath
    };
}
