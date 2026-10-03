import { runAI } from "../ai/groq.js";
import { writeGeneratedFile } from "./fileGenerator.js";


// ============================================================
// 1. AI → React Specification
// ============================================================

export async function generateReactSpec(
    websiteSpec,
    componentPlan
) {
    const input = {
        page: {
            title: websiteSpec.metadata.title,
            url: websiteSpec.metadata.url
        },

        componentPlan,

        // Keep structure compact to control AI token usage.
        structure: websiteSpec.structure.sections
            .slice(0, 10)
            .map((section) => ({
                tag: section.tag,
                heading: section.heading,
                x: section.position?.x,
                y: section.position?.y,
                width: section.size?.width,
                height: section.size?.height,
                background: section.backgroundColor,
                display: section.display
            })),

        content: {
            headings: websiteSpec.content.headings
                .slice(0, 15)
                .map((heading) => ({
                    tag: heading.tag,
                    text: heading.text
                })),

            paragraphs: websiteSpec.content.paragraphs
                .slice(0, 12),

            buttons: websiteSpec.content.buttons
                .slice(0, 12)
                .map((button) => button.text)
                .filter(Boolean)
        },

        design: {
            body: websiteSpec.design.styles?.body,
            h1: websiteSpec.design.styles?.h1,
            h2: websiteSpec.design.styles?.h2,
            p: websiteSpec.design.styles?.p,
            button: websiteSpec.design.styles?.button
        },

        // IMPORTANT:
        // Do NOT send huge image URLs to the AI.
        // Give each image a compact ID instead.
        assets: websiteSpec.assets.images
            .slice(0, 8)
            .map((image, index) => ({
                id: `img-${index}`,
                alt: image.alt,
                width: image.width,
                height: image.height
            }))
    };

    const prompt = `
You are a React UI architecture generator.

Create a structured page specification for recreating the analyzed website.

Do NOT generate React code.
Do NOT generate CSS.
Return ONLY valid JSON.

Use exactly this structure:

{
    "theme": {
        "fontFamily": "string",
        "primaryColor": "string",
        "secondaryColor": "string",
        "textColor": "string",
        "backgroundColor": "string"
    },

    "sections": [
        {
            "type": "navbar | hero | features | stats | customers | resources | cta | footer",
            "title": "string",
            "description": "string",
            "buttons": ["string"],
            "layout": "left | center | right | split | grid",
            "background": "string",
            "image": "string",
            "navItems": ["string"],
            "items": [
                {
                    "title": "string",
                    "description": "string",
                    "image": "string"
                }
            ]
        }
    ]
}

Rules:

1. Use the supplied website evidence.
2. Follow the component plan.
3. Preserve important visible text.
4. Identify the major page sections.
5. Use supplied asset IDs when an image is relevant.
6. Do not invent large amounts of content.
7. Keep the structure concise.
8. Do not reproduce HTML.
9. Do not return markdown.
10. Return valid JSON only.
11. Preserve the original visual hierarchy and section order.
12. Use layout based on the supplied structure evidence.
13. Use navItems for navigation links instead of placing them in items.
14. For images, return the supplied asset ID such as "assets/img-0".
15. Prefer faithful reconstruction over generic UI patterns.
16. Do not invent images when no suitable asset exists.
17. Preserve the original section order.
18. Use the original text whenever it is available.

Website evidence:

${JSON.stringify(input)}
`;

    console.log(
        "🧩 Generator AI input:",
        JSON.stringify(input).length,
        "characters"
    );

    const response = await runAI(prompt);

    return JSON.parse(response);
}


// ============================================================
// 2. Helpers for generated React
// ============================================================

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function resolveImageUrl(
    imageReference,
    websiteSpec
) {
    if (!imageReference) {
        return "";
    }

    // Already a real URL.
    if (
        imageReference.startsWith("http://") ||
        imageReference.startsWith("https://") ||
        imageReference.startsWith("/")
    ) {
        return imageReference;
    }

    /*
        AI returns:

        assets/img-0
        assets/img-1
        assets/img-2

        We map that back to:

        websiteSpec.assets.images[index].src
    */

    const match = imageReference.match(
        /img-(\d+)/
    );

    if (!match) {
        return "";
    }

    const index = Number(match[1]);

    return (
        websiteSpec?.assets?.images?.[index]?.src ||
        ""
    );
}


// ============================================================
// 3. Generate App.jsx
// ============================================================

export function createAppComponent(
    reactSpec,
    websiteSpec
) {
    // THIS WAS MISSING IN THE PREVIOUS VERSION.
    const sections = reactSpec.sections || [];

    const getSiteName = () => {
        const pageTitle = websiteSpec?.metadata?.title || "";
        if (pageTitle) {
            return pageTitle.split("|")[0].trim();
        }
        try {
            const hostname = new URL(websiteSpec.metadata.url).hostname.replace(/^www\./, "").split(".")[0];
            return hostname.charAt(0).toUpperCase() + hostname.slice(1);
        } catch {
            return "Website";
        }
    };
    
    const siteName = getSiteName();
    
    console.log(
        "🖼️ Hero image:",
        resolveImageUrl(
            sections.find((section) => section.type === "hero")?.image,
            websiteSpec
        )
    );


    // --------------------------------------------------------
    // Buttons
    // --------------------------------------------------------

    const renderButtons = (buttons = []) => {
        if (!buttons.length) {
            return "";
        }

        return `
            <div className="hero-buttons">
                ${buttons
                    .map(
                        (button) => `
                            <button className="primary-button">
                                ${escapeHtml(button)}
                            </button>
                        `
                    )
                    .join("")}
            </div>
        `;
    };


    // --------------------------------------------------------
    // Cards
    // --------------------------------------------------------

    const renderItems = (items = []) => {
        return items
            .map((item) => {

                const imageUrl = resolveImageUrl(
                    item.image,
                    websiteSpec
                );

                return `
                    <article className="card">

                        ${
                            imageUrl
                                ? `
                                    <div className="card-image">
                                        <img
                                            src="${escapeHtml(imageUrl)}"
                                            alt="${escapeHtml(
                                                item.title || ""
                                            )}"
                                            loading="lazy"
                                        />
                                    </div>
                                `
                                : ""
                        }

                        <div className="card-content">

                            ${
                                item.title
                                    ? `
                                        <h3>
                                            ${escapeHtml(
                                                item.title
                                            )}
                                        </h3>
                                    `
                                    : ""
                            }

                            ${
                                item.description
                                    ? `
                                        <p>
                                            ${escapeHtml(
                                                item.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                    </article>
                `;
            })
            .join("");
    };


    // ========================================================
    // Render sections
    // ========================================================

    const sectionCode = sections
        .map((section) => {

            const type = section.type;


            // =================================================
            // NAVBAR
            // =================================================

            if (type === "navbar") {
                const navItems =
                    section.navItems ||
                    (section.items || [])
                        .map((item) => item.title)
                        .filter(Boolean);

                return `
                    <header className="navbar">
                        <div className="navbar-inner">
                            <a href="#top" className="logo">
                                ${escapeHtml(
                                    section.title && section.title !== "Website"
                                        ? section.title
                                        : siteName
                                )}
                            </a>

                            <nav className={\`nav-links \${isMobileMenuOpen ? 'open' : ''}\`}>
                                ${navItems
                                    .map((item) => {
                                        const anchor = item.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                        return `
                                            <a href="#${anchor}" onClick={closeMenu}>
                                                ${escapeHtml(item)}
                                            </a>
                                        `;
                                    })
                                    .join("")}
                            </nav>

                            <button
                                className="mobile-menu"
                                aria-label="Open navigation"
                                onClick={toggleMenu}
                            >
                                ☰
                            </button>
                        </div>
                    </header>
                `;
            }


            // =================================================
            // HERO
            // =================================================

            if (type === "hero") {

                const imageUrl =
                    resolveImageUrl(
                        section.image,
                        websiteSpec
                    );

                const layoutClass =
                    section.layout === "split"
                        ? "hero-split"
                        : "";

                return `
                    <section
                        className="hero ${layoutClass}"
                        ${
                            section.background
                                ? `style="background:${escapeHtml(
                                      section.background
                                  )}"`
                                : ""
                        }
                    >

                        <div className="hero-content">

                            ${
                                section.title
                                    ? `
                                        <h1>
                                            ${escapeHtml(
                                                section.title
                                            )}
                                        </h1>
                                    `
                                    : ""
                            }

                            ${
                                section.description
                                    ? `
                                        <p>
                                            ${escapeHtml(
                                                section.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                            ${renderButtons(
                                section.buttons
                            )}

                        </div>

                        ${
                            imageUrl
                                ? `
                                    <div className="hero-visual">

                                        <img
                                            src="${escapeHtml(
                                                imageUrl
                                            )}"
                                            alt="Hero visual"
                                        />

                                    </div>
                                `
                                : ""
                        }

                    </section>
                `;
            }


            // =================================================
            // STATS
            // =================================================

            if (type === "stats") {

                return `
                    <section id={section.title ? section.title.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined} className="stats-section">

                        <div className="stats-grid">

                            ${(section.items || [])
                                .map(
                                    (item) => `
                                        <div className="stat-card">

                                            <h3>
                                                ${escapeHtml(
                                                    item.title || ""
                                                )}
                                            </h3>

                                            ${
                                                item.description
                                                    ? `
                                                        <p>
                                                            ${escapeHtml(
                                                                item.description
                                                            )}
                                                        </p>
                                                    `
                                                    : ""
                                            }

                                        </div>
                                    `
                                )
                                .join("")}

                        </div>

                    </section>
                `;
            }


            // =================================================
            // FEATURES
            // =================================================

            if (type === "features") {

                return `
                    <section
                        className="section features-section"
                        ${
                            section.background
                                ? `style="background:${escapeHtml(
                                      section.background
                                  )}"`
                                : ""
                        }
                    >

                        <div className="section-header">

                            ${
                                section.title
                                    ? `
                                        <h2>
                                            ${escapeHtml(
                                                section.title
                                            )}
                                        </h2>
                                    `
                                    : ""
                            }

                            ${
                                section.description
                                    ? `
                                        <p>
                                            ${escapeHtml(
                                                section.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                        <div className="card-grid">

                            ${renderItems(
                                section.items
                            )}

                        </div>

                    </section>
                `;
            }


            // =================================================
            // CUSTOMERS
            // =================================================

            if (type === "customers") {

                return `
                    <section id={section.title ? section.title.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined} className="section customers">

                        ${
                            section.title
                                ? `
                                    <div className="section-header">

                                        <h2>
                                            ${escapeHtml(
                                                section.title
                                            )}
                                        </h2>

                                        ${
                                            section.description
                                                ? `
                                                    <p>
                                                        ${escapeHtml(
                                                            section.description
                                                        )}
                                                    </p>
                                                `
                                                : ""
                                        }

                                    </div>
                                `
                                : ""
                        }

                        <div className="customer-grid">

                            ${renderItems(
                                section.items
                            )}

                        </div>

                    </section>
                `;
            }


            // =================================================
            // RESOURCES
            // =================================================

            if (type === "resources") {

                return `
                    <section id={section.title ? section.title.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined} className="section resources">

                        <div className="section-header">

                            ${
                                section.title
                                    ? `
                                        <h2>
                                            ${escapeHtml(
                                                section.title
                                            )}
                                        </h2>
                                    `
                                    : ""
                            }

                            ${
                                section.description
                                    ? `
                                        <p>
                                            ${escapeHtml(
                                                section.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                        <div className="card-grid">

                            ${renderItems(
                                section.items
                            )}

                        </div>

                    </section>
                `;
            }


            // =================================================
            // CTA
            // =================================================

            if (type === "cta") {

                return `
                    <section className="cta">

                        <div className="cta-content">

                            ${
                                section.title
                                    ? `
                                        <h2>
                                            ${escapeHtml(
                                                section.title
                                            )}
                                        </h2>
                                    `
                                    : ""
                            }

                            ${
                                section.description
                                    ? `
                                        <p>
                                            ${escapeHtml(
                                                section.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                            ${renderButtons(
                                section.buttons
                            )}

                        </div>

                    </section>
                `;
            }


            // =================================================
            // FOOTER
            // =================================================

            if (type === "footer") {

                const footerLinks =
                    section.navItems ||
                    (section.items || [])
                        .map((item) => item.title)
                        .filter(Boolean);

                return `
                    <footer className="footer">

                        <div className="footer-inner">

                            <div className="footer-brand">

                                <h3>
                                    ${escapeHtml(
                                        section.title ||
                                            "Website"
                                    )}
                                </h3>

                                ${
                                    section.description
                                        ? `
                                            <p>
                                                ${escapeHtml(
                                                    section.description
                                                )}
                                            </p>
                                        `
                                        : ""
                                }

                            </div>

                            ${
                                footerLinks.length
                                    ? `
                                        <div className="footer-links">

                                            ${footerLinks
                                                .map(
                                                    (link) => `
                                                        <a href="#">
                                                            ${escapeHtml(
                                                                link
                                                            )}
                                                        </a>
                                                    `
                                                )
                                                .join("")}

                                        </div>
                                    `
                                    : ""
                            }

                        </div>

                    </footer>
                `;
            }


            return "";
        })
        .join("\n");


    // ========================================================
    // Final App.jsx
    // ========================================================

    return `
import React, { useState } from "react";
import "./styles.css";

function App() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <div id="top" className="app">
            ${sectionCode}
        </div>
    );
}

export default App;
`;
}


// ============================================================
// 4. Write App.jsx
// ============================================================

export async function generateAppFile(
    reactSpec,
    websiteSpec
) {
    const appCode = createAppComponent(
        reactSpec,
        websiteSpec
    );

    await writeGeneratedFile(
        "src/App.jsx",
        appCode
    );

    return appCode;
}


// ============================================================
// 5. Generate main.jsx
// ============================================================

export async function generateMainFile() {

    const mainCode = `
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
`;

    await writeGeneratedFile(
        "src/main.jsx",
        mainCode
    );

    return mainCode;
}


// ============================================================
// 6. Generate styles.css
// ============================================================

export async function generateStylesFile(
    reactSpec
) {
    const theme =
        reactSpec.theme || {};

    const fontFamily =
        theme.fontFamily ||
        "system-ui, sans-serif";

    const primaryColor =
        theme.primaryColor ||
        "#635bff";

    const secondaryColor =
        theme.secondaryColor ||
        "#f6f9fc";

    const textColor =
        theme.textColor ||
        "#0a2540";

    const backgroundColor =
        theme.backgroundColor ||
        "#ffffff";


    const styles = `

:root {
    --primary-color: ${primaryColor};
    --secondary-color: ${secondaryColor};
    --text-color: ${textColor};
    --background-color: ${backgroundColor};
    --font-family: ${fontFamily};
}

* {
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    margin: 0;

    font-family:
        var(--font-family);

    color:
        var(--text-color);

    background:
        var(--background-color);
}

button,
a {
    font: inherit;
}

a {
    text-decoration: none;
    color: inherit;
}

img {
    max-width: 100%;
    display: block;
}

.app {
    width: 100%;
    min-height: 100vh;
    overflow-x: hidden;
}


/* ==========================================================
   NAVBAR
   ========================================================== */

.navbar {
    width: 100%;

    padding:
        18px 5%;

    position: relative;

    z-index: 20;
}

.navbar-inner {
    max-width: 1280px;

    margin: 0 auto;

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 30px;
}

.logo {
    font-size: 22px;
    font-weight: 700;
}

.nav-links {
    display: flex;

    align-items: center;

    gap: 28px;

    font-size: 14px;
}

.nav-links a {
    opacity: 0.8;

    transition:
        opacity 0.2s ease;
}

.nav-links a:hover {
    opacity: 1;
}

.mobile-menu {
    display: none;

    border: none;

    background: transparent;

    font-size: 24px;

    cursor: pointer;
}


/* ==========================================================
   HERO
   ========================================================== */

.hero {
    max-width: 1280px;

    min-height: 560px;

    margin: 0 auto;

    padding:
        90px 5%;

    display: flex;

    align-items: center;
}

.hero-content {
    width: 100%;

    max-width: 760px;
}

.hero-split {
    max-width: 1400px;

    gap: 70px;
}

.hero-split .hero-content {
    flex: 1;
}

.hero h1 {
    margin:
        0 0 28px;

    font-size:
        clamp(44px, 6vw, 76px);

    line-height: 1.02;

    letter-spacing:
        -0.04em;

    font-weight: 500;
}

.hero p {
    max-width: 680px;

    margin: 0;

    font-size: 20px;

    line-height: 1.55;

    opacity: 0.72;
}

.hero-visual {
    flex: 1;

    display: flex;

    justify-content: center;

    align-items: center;
}

.hero-visual img {
    width: 100%;

    max-height: 520px;

    object-fit: contain;
}


/* ==========================================================
   BUTTONS
   ========================================================== */

.hero-buttons {
    display: flex;

    flex-wrap: wrap;

    gap: 14px;

    margin-top: 32px;
}

.primary-button {
    border: none;

    padding:
        13px 22px;

    border-radius:
        999px;

    background:
        var(--primary-color);

    color: white;

    font-weight: 600;

    cursor: pointer;

    transition:
        transform 0.2s ease,
        opacity 0.2s ease;
}

.primary-button:hover {
    transform:
        translateY(-2px);

    opacity: 0.9;
}


/* ==========================================================
   SECTIONS
   ========================================================== */

.section {
    max-width: 1280px;

    margin: 0 auto;

    padding:
        90px 5%;
}

.section-header {
    max-width: 760px;

    margin-bottom: 45px;
}

.section-header h2,
.cta h2 {
    margin:
        0 0 18px;

    font-size:
        clamp(34px, 4vw, 54px);

    line-height: 1.08;

    letter-spacing:
        -0.03em;
}

.section-header p,
.cta p {
    margin: 0;

    font-size: 18px;

    line-height: 1.6;

    opacity: 0.72;
}


/* ==========================================================
   FEATURES
   ========================================================== */

.card-grid {
    display: grid;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        );

    gap: 18px;
}

.card {
    min-height: 220px;

    overflow: hidden;

    border-radius: 18px;

    background:
        var(--secondary-color);

    transition:
        transform 0.25s ease,
        box-shadow 0.25s ease;
}

.card:hover {
    transform:
        translateY(-4px);

    box-shadow:
        0 18px 45px
        rgba(0, 0, 0, 0.08);
}

.card-image {
    width: 100%;

    height: 180px;

    overflow: hidden;
}

.card-image img {
    width: 100%;

    height: 100%;

    object-fit: cover;
}

.card-content {
    padding: 26px;
}

.card h3 {
    margin:
        0 0 10px;

    font-size: 20px;
}

.card p {
    margin: 0;

    line-height: 1.55;

    opacity: 0.75;
}


/* ==========================================================
   STATS
   ========================================================== */

.stats-section {
    max-width: 1280px;

    margin: 0 auto;

    padding:
        70px 5%;
}

.stats-grid {
    display: grid;

    grid-template-columns:
        repeat(
            4,
            minmax(0, 1fr)
        );

    gap: 24px;
}

.stat-card {
    padding: 30px;

    text-align: center;
}

.stat-card h3 {
    margin:
        0 0 10px;

    font-size: 38px;

    line-height: 1.1;
}

.stat-card p {
    margin: 0;

    line-height: 1.5;

    opacity: 0.72;
}


/* ==========================================================
   CUSTOMERS
   ========================================================== */

.customers {
    padding-top: 80px;
}

.customer-grid {
    display: grid;

    grid-template-columns:
        repeat(
            3,
            minmax(0, 1fr)
        );

    gap: 20px;
}


/* ==========================================================
   CTA
   ========================================================== */

.cta {
    max-width: 1160px;

    margin:
        60px auto;

    padding:
        70px;

    border-radius: 28px;

    background:
        var(--primary-color);

    color: white;
}

.cta-content {
    max-width: 750px;
}


/* ==========================================================
   FOOTER
   ========================================================== */

.footer {
    margin-top: 80px;

    padding:
        60px 5%;

    background:
        #f8fafc;
}

.footer-inner {
    max-width: 1280px;

    margin: 0 auto;

    display: flex;

    justify-content: space-between;

    gap: 50px;
}

.footer-brand {
    max-width: 400px;
}

.footer-brand h3 {
    margin:
        0 0 12px;
}

.footer-brand p {
    line-height: 1.6;

    opacity: 0.7;
}

.footer-links {
    display: flex;

    flex-wrap: wrap;

    gap: 20px;

    align-content: flex-start;
}

.footer-links a {
    opacity: 0.75;
}

.footer-links a:hover {
    opacity: 1;
}


/* ==========================================================
   TABLET
   ========================================================== */

@media (max-width: 900px) {

    .nav-links {
        gap: 14px;
    }

    .hero {
        min-height: auto;

        padding:
            70px 5%;
    }

    .hero-split {
        flex-direction: column;

        gap: 40px;
    }

    .hero-visual {
        width: 100%;
    }

    .card-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
    }

    .stats-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
    }

    .customer-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
    }

    .footer-inner {
        flex-direction: column;
    }
}


/* ==========================================================
   MOBILE
   ========================================================== */

@media (max-width: 600px) {

    .navbar {
        padding:
            16px 5%;
    }

    .nav-links {
        display: none;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: var(--background-color);
        padding: 20px;
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        text-align: center;
        gap: 20px;
    }

    .nav-links.open {
        display: flex;
    }

    .mobile-menu {
        display: block;
    }

    .hero {
        padding:
            60px 5%;
    }

    .hero h1 {
        font-size:
            clamp(38px, 12vw, 56px);
    }

    .hero p {
        font-size: 17px;
    }

    .section {
        padding:
            60px 5%;
    }

    .stats-section {
        padding:
            50px 5%;
    }

    .card-grid,
    .stats-grid,
    .customer-grid {
        grid-template-columns: 1fr;
    }

    .cta {
        margin:
            40px 5%;

        padding:
            45px 25px;
    }

    .footer {
        padding:
            50px 5%;
    }

    .footer-links {
        flex-direction: column;
    }
}

`;

    await writeGeneratedFile(
        "src/styles.css",
        styles
    );

    return styles;
}


// ============================================================
// 7. Generate index.html
// ============================================================

export async function generateIndexFile(
    websiteSpec
) {
    const title =
        websiteSpec.metadata?.title ||
        "Generated Website";

    const indexCode = `
<!doctype html>

<html lang="en">

<head>

    <meta charset="UTF-8" />

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    />

    <title>
        ${escapeHtml(title)}
    </title>

</head>

<body>

    <div id="root"></div>

    <script
        type="module"
        src="/src/main.jsx"
    ></script>

</body>

</html>
`;

    await writeGeneratedFile(
        "index.html",
        indexCode
    );

    return indexCode;
}


// ============================================================
// 8. Generate package.json
// ============================================================

export async function generatePackageFile() {

    const packageJson = {
        name: "soulclone-generated-site",

        version: "1.0.0",

        private: true,

        type: "module",

        scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview"
        },

        dependencies: {
            react: "^19.1.0",
            "react-dom": "^19.1.0",
            vite: "^7.1.7"
        }
    };


    const packageCode = JSON.stringify(
        packageJson,
        null,
        4
    );


    await writeGeneratedFile(
        "package.json",
        packageCode
    );

    return packageCode;
}