import fs from "fs/promises";
import Groq from "groq-sdk";

console.log(
    "Groq key:",
    process.env.GROQ_API_KEY
        ? `${process.env.GROQ_API_KEY.slice(0, 6)}...`
        : "MISSING"
);

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const TEXT_MODEL =
    process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b";

const VISION_MODEL =
    process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

const QUOTA_MAX_RETRIES = Number(process.env.GROQ_QUOTA_MAX_RETRIES ?? 2);
const QUOTA_MAX_WAIT_MS = Number(process.env.GROQ_QUOTA_MAX_WAIT_MS ?? 15000);
// How long to fail fast after quota is finally exhausted (per-minute windows).
const QUOTA_BREAKER_MS = Number(process.env.GROQ_QUOTA_BREAKER_MS ?? 60000);
// Daily request limits cannot recover within a run; wait much longer.
const DAILY_BREAKER_MS = Number(process.env.GROQ_DAILY_BREAKER_MS ?? 600000);

let quotaExhaustedUntil = 0;
let quotaFailures = 0;
let lastQuotaError = null;

export function isGroqQuotaExhausted() {
    return Date.now() < quotaExhaustedUntil;
}

export function getGroqQuotaStatus() {
    return {
        exhausted: isGroqQuotaExhausted(),
        exhaustedForMs: Math.max(0, quotaExhaustedUntil - Date.now()),
        quotaFailures,
        lastError: lastQuotaError
    };
}

export function summarizeRunAIStatus(quotaFailuresBefore = 0) {
    const status = getGroqQuotaStatus();
    const runFailures = status.quotaFailures - quotaFailuresBefore;

    if (runFailures <= 0) {
        return { degraded: false };
    }

    return {
        degraded: true,
        reason: "groq_quota",
        quotaExhausted: status.exhausted,
        retryInSeconds: Math.ceil(status.exhaustedForMs / 1000),
        detail: status.lastError
    };
}

function readHeader(error, name) {
    const headers = error?.headers;
    if (!headers) return null;

    if (typeof headers.get === "function") {
        return headers.get(name);
    }

    return headers[name] ?? null;
}

function getRetryAfterMs(error) {
    const retryAfter = readHeader(error, "retry-after");
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds) && seconds > 0) {
        return seconds * 1000;
    }

    return null;
}

function isDailyLimitError(error) {
    return /requests per day|\bRPD\b/i.test(String(error?.message || ""));
}

function makeQuotaError(error) {
    const retryAfter =
        readHeader(error, "retry-after") ||
        Math.ceil((quotaExhaustedUntil - Date.now()) / 1000) ||
        "later";

    const message =
        "Groq token quota is currently exhausted. " +
        `Retry after ${retryAfter} or use the next quota window.`;

    const quotaError = new Error(message);
    quotaError.code = "GROQ_RATE_LIMIT";
    quotaError.retryAfter = retryAfter;
    return quotaError;
}

function tripQuotaBreaker(error) {
    quotaFailures += 1;
    lastQuotaError = error?.message || "Groq rate limit";

    const now = Date.now();
    const daily = isDailyLimitError(error);

    quotaExhaustedUntil = Math.max(
        quotaExhaustedUntil,
        now + (daily ? DAILY_BREAKER_MS : QUOTA_BREAKER_MS)
    );

    console.error(
        `⏳ Groq quota exhausted${daily ? " (daily limit)" : ""}; ` +
            `AI calls will fail fast for ${Math.round(
                (quotaExhaustedUntil - now) / 1000
            )}s.`
    );
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withQuotaRetry(request) {
    if (isGroqQuotaExhausted()) {
        throw makeQuotaError({ headers: null, message: lastQuotaError });
    }

    for (let attempt = 0; attempt <= QUOTA_MAX_RETRIES; attempt += 1) {
        try {
            return await request();
        } catch (error) {
            if (error?.status !== 429) {
                console.error("❌ Groq API error:", error);
                throw error;
            }

            if (isDailyLimitError(error)) {
                tripQuotaBreaker(error);
                throw makeQuotaError(error);
            }

            if (attempt >= QUOTA_MAX_RETRIES) {
                tripQuotaBreaker(error);
                throw makeQuotaError(error);
            }

            const backoffMs = 2000 * 2 ** attempt;
            const waitMs = Math.min(
                getRetryAfterMs(error) ?? backoffMs,
                QUOTA_MAX_WAIT_MS
            );

            console.warn(
                `⏳ Groq rate limited (attempt ${attempt + 1}/${QUOTA_MAX_RETRIES + 1}); retrying in ${Math.round(waitMs / 1000)}s...`
            );

            await sleep(waitMs + Math.floor(Math.random() * 500));
        }
    }
}

export async function runAI(prompt, options = {}) {
    console.log(`🚀 Sending request to Groq (${TEXT_MODEL})...`);

    const response = await withQuotaRetry(() =>
        client.chat.completions.create(
            {
                model: TEXT_MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: options.temperature ?? 0.7,
                ...(options.max_completion_tokens
                    ? { max_completion_tokens: options.max_completion_tokens }
                    : {}),
                ...(options.response_format
                    ? { response_format: options.response_format }
                    : {}),
                ...(options.reasoning_effort
                    ? { reasoning_effort: options.reasoning_effort }
                    : {})
            },
            {
                timeout: options.timeout ?? 30000,
                // Quota retries are owned by withQuotaRetry so waits stay
                // bounded; the SDK default would sleep full retry-after twice.
                maxRetries: 0
            }
        )
    );

    console.log("📥 Response received from Groq");

    return (
        response?.choices?.[0]?.message?.content?.trim() ||
        "No response generated."
    );
}

export async function runVisionAI(
    prompt,
    imagePaths = [],
    options = {}
) {
    const paths = imagePaths
        .filter(Boolean)
        .slice(0, 3);

    if (!paths.length) {
        throw new Error("Vision AI requires at least one image.");
    }

    const imageContents = await Promise.all(
        paths.map(async (imagePath) => {
            const buffer = await fs.readFile(imagePath);
            const extension =
                imagePath.toLowerCase().endsWith(".jpg") ||
                imagePath.toLowerCase().endsWith(".jpeg")
                    ? "jpeg"
                    : "png";

            return {
                type: "image_url",
                image_url: {
                    url: `data:image/${extension};base64,${buffer.toString("base64")}`
                }
            };
        })
    );

    console.log(
        `👁️ Sending ${imageContents.length} image(s) to ${VISION_MODEL}...`
    );

    const response = await withQuotaRetry(() =>
        client.chat.completions.create(
            {
                model: VISION_MODEL,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt
                            },
                            ...imageContents
                        ]
                    }
                ],
                temperature: options.temperature ?? 0.2,
                max_completion_tokens:
                    options.max_completion_tokens ?? 1000,
                ...(options.response_format
                    ? { response_format: options.response_format }
                    : {}),
                ...(options.reasoning_effort
                    ? { reasoning_effort: options.reasoning_effort }
                    : {})
            },
            {
                timeout: options.timeout ?? 45000,
                maxRetries: 0
            }
        )
    );

    console.log("📥 Vision response received from Groq");

    return (
        response?.choices?.[0]?.message?.content?.trim() ||
        "No response generated."
    );
}
