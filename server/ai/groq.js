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

const MODEL_NAME = "openai/gpt-oss-120b";

export async function runAI(prompt) {
    try {
        console.log("🚀 Sending request to Groq...");

        const response = await client.chat.completions.create(
            {
                model: MODEL_NAME,
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.7,
            },
            {
                timeout: 30000,
            }
        );

        console.log("📥 Response received from Groq");

        return (
            response?.choices?.[0]?.message?.content?.trim() ||
            "No response generated."
        );
    } catch (error) {
        console.error("❌ Groq API error:", error);
        throw error;
    }
}