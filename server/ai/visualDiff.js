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
        salientPixels,
        salientPixelRatio: Number(
            (salientPixels / totalPixels).toFixed(4)
        ),
        width: original.width,
        height: original.height,
        diffPath
    };
}
