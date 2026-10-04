import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

function readPng(filePath) {
    return PNG.sync.read(fs.readFileSync(filePath));
}

function colorDistance(data, index, background) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];

    return Math.sqrt(
        ((r - background.r) ** 2) +
        ((g - background.g) ** 2) +
        ((b - background.b) ** 2)
    );
}

function estimateBackground(data, width, height) {
    const points = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1]
    ];

    let r = 0;
    let g = 0;
    let b = 0;

    for (const [x, y] of points) {
        const index = (y * width + x) * 4;
        r += data[index];
        g += data[index + 1];
        b += data[index + 2];
    }

    return {
        r: r / points.length,
        g: g / points.length,
        b: b / points.length
    };
}

export function compareScreenshots(
    originalPath,
    generatedPath,
    diffPath = "screenshots/visual-diff.png",
    sections = []
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

    // A flat background can dominate a marketing screenshot and make a
    // visually poor recreation look artificially strong. Estimate the
    // background from the four corners and give foreground/UI pixels more
    // influence in the reported score.
    const background = estimateBackground(
        original.data,
        original.width,
        original.height
    );

    let salientPixels = 0;
    let salientDiffPixels = 0;

    for (let pixel = 0; pixel < totalPixels; pixel++) {
        const index = pixel * 4;

        const originalDistance = colorDistance(
            original.data,
            index,
            background
        );

        const generatedDistance = colorDistance(
            generated.data,
            index,
            background
        );

        const salient =
            originalDistance > 28 ||
            generatedDistance > 28;

        if (!salient) continue;

        salientPixels++;

        const changed =
            diff.data[index] > 0 ||
            diff.data[index + 1] > 0 ||
            diff.data[index + 2] > 0;

        if (changed) {
            salientDiffPixels++;
        }
    }

    const baseSimilarity =
        1 - diffPixels / totalPixels;

    const foregroundSimilarity =
        salientPixels > 0
            ? 1 - salientDiffPixels / salientPixels
            : baseSimilarity;

    // Foreground-heavy score is the primary score, while the base score
    // prevents tiny text/edge differences from dominating the metric.
    const similarity =
        salientPixels > totalPixels * 0.03
            ? (0.35 * baseSimilarity) +
              (0.65 * foregroundSimilarity)
            : baseSimilarity;

    const sectionScores = sections.slice(0, 12).map((section, index) => {
        const box = section.box || {
            x: section.position?.x || 0,
            y: section.position?.y || 0,
            width: section.size?.width || original.width,
            height: section.size?.height || 0
        };
        const left = Math.max(0, Math.floor(box.x || 0));
        const top = Math.max(0, Math.floor(box.y || 0));
        const right = Math.min(original.width, Math.ceil(left + box.width));
        const bottom = Math.min(original.height, Math.ceil(top + box.height));
        let pixels = 0, changedPixels = 0;
        for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
            const offset = (y * original.width + x) * 4;
            pixels += 1;
            const redDelta = original.data[offset] - generated.data[offset];
            const greenDelta = original.data[offset + 1] - generated.data[offset + 1];
            const blueDelta = original.data[offset + 2] - generated.data[offset + 2];
            if ((redDelta * redDelta) + (greenDelta * greenDelta) + (blueDelta * blueDelta) > (255 * 0.1) ** 2) changedPixels += 1;
        }
        const errorPercentage = pixels ? Number((changedPixels * 100 / pixels).toFixed(1)) : null;
        return { sectionId: section.id || `section-${index + 1}`, heading: section.heading || null, boundingBox: { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }, similarity: errorPercentage == null ? null : Number((100 - errorPercentage).toFixed(1)), errorPercentage };
    });

    return {
        comparable: true,
        diffPixels,
        totalPixels,
        diffRatio: Number((diffPixels / totalPixels).toFixed(4)),
        similarity: Number(similarity.toFixed(4)),
        baseSimilarity: Number(baseSimilarity.toFixed(4)),
        foregroundSimilarity: Number(
            foregroundSimilarity.toFixed(4)
        ),
        sections: sectionScores,
        salientPixels,
        salientPixelRatio: Number(
            (salientPixels / totalPixels).toFixed(4)
        ),
        width: original.width,
        height: original.height,
        diffPath
    };
}
