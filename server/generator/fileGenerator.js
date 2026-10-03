import fs from "fs/promises";
import path from "path";

export async function writeGeneratedFile(filename, content) {
    const generatedDir = path.resolve("generated-site");

    const filePath = path.join(
        generatedDir,
        filename
    );

    await fs.mkdir(
        path.dirname(filePath),
        { recursive: true }
    );

    await fs.writeFile(
        filePath,
        content,
        "utf-8"
    );

    console.log(`📄 Generated: ${filePath}`);

    return filePath;
}