import dotenv from "dotenv";

dotenv.config();

console.log(
    "Test key:",
    process.env.GROQ_API_KEY
        ? `${process.env.GROQ_API_KEY.slice(0, 6)}...`
        : "MISSING"
);

const { runAI } = await import("./ai/groq.js");

const prompt = `
You are a frontend architecture analyst.

Analyze this website information:

- Page type: landing page
- Heading: Build faster with AI
- Paragraph: Create modern websites using artificial intelligence.
- Buttons: Get Started, Learn More
- Sections: Hero, Features, Testimonials, Footer

Return ONLY valid JSON in this format:

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
`;

const result = await runAI(prompt);

console.log("\n🤖 AI RESULT:\n");
console.log(result);