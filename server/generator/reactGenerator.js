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
        landmarks: (websiteSpec.structure.landmarks || [])
            .slice(0, 8)
            .map((landmark) => ({
                tag: landmark.tag,
                className: landmark.className,
                y: landmark.position?.y,
                width: landmark.size?.width,
                height: landmark.size?.height
            })),

        structure: websiteSpec.structure.sections
            .slice(0, 14)
            .map((section) => ({
                tag: section.tag,
                heading: section.heading,
                x: section.position?.x,
                y: section.position?.y,
                width: section.size?.width,
                height: section.size?.height,
                columns: section.gridColumns,
                isFullWidth: section.size?.width > 1000,
                background: section.backgroundColor,
                backgroundImage: section.backgroundImage,
                display: section.display,
                flexDirection: section.flexDirection,
                borderRadius: section.borderRadius,
                padding: section.padding,
                gap: section.gap,
                media: (section.media || []).map((media) => ({
                    assetId: `assets/img-${media.assetIndex}`,
                    alt: media.alt,
                    width: media.width,
                    height: media.height,
                    naturalWidth: media.naturalWidth,
                    naturalHeight: media.naturalHeight,
                    role: media.role,
                    x: media.x,
                    y: media.y
                }))
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
                .filter((button) => button.text)
                .map((button) => ({ text: button.text, url: button.url })),

            textBlocks: websiteSpec.content.textBlocks
                ? websiteSpec.content.textBlocks.slice(0, 40)
                : [],

            controls: websiteSpec.content.controls
                ? websiteSpec.content.controls.slice(0, 10)
                : []
        },

        visualAnalysis: websiteSpec.visualAnalysis || null,

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
            .slice(0, 20)
            .map((image, index) => ({
                id: `img-${index}`,
                src: image.src,
                alt: image.alt,
                width: image.width,
                height: image.height,
                local: Boolean(image.local)
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
            "type": "navbar | hero | showcase | split | search | features | stats | logos | customers | resources | testimonial | cta | footer",
            "title": "string",
            "description": "string",
            "buttons": [{"text": "string", "url": "string"}],
            "layout": "full | center | split | grid | wide",
            "columns": 1,
            "background": "string",
            "image": "string",
            "imageAspectRatio": "auto | square | video | wide",
            "visual": {
                "minHeight": 0,
                "contentWidth": 0,
                "imageWidth": 0,
                "imagePosition": "none | below | left | right | background",
                "imageOverlap": 0,
                "spacing": "string"
            },
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
2. Treat visualAnalysis as first-class evidence for layout and visual hierarchy.
3. Follow the component plan.
4. Preserve important visible text.
5. Identify the major page sections.
6. Use supplied asset IDs when an image is relevant.
6. Do not invent large amounts of content.
7. Keep the structure concise.
8. Do not reproduce HTML.
9. Do not return markdown.
10. Return valid JSON only.
11. Preserve the original visual hierarchy and section order.
12. Use layout based on the supplied structure evidence.
13. Use navItems for navigation links instead of placing them in items.
15. For images, return the supplied asset ID such as "assets/img-0".
16. Prefer faithful reconstruction over generic UI patterns.
17. Use section media evidence to associate the correct image with the section.
18. If a section contains a large visual, use it as a primary visual rather than rendering it as a small card.
19. For product/marketing pages, prefer showcase or split sections when the source visibly uses large product screenshots beside text.
20. Use visual.minHeight/contentWidth/imageWidth to preserve the measured composition.
21. Use logos for repeated brand/logo areas and testimonial for quoted customer content.
22. Do not turn large visual regions into generic 3-column cards.
23. Preserve large whitespace only when the source screenshot clearly contains it.
24. The generated page should feel like the source's composition, not a generic landing-page template.
17. Do not invent images when no suitable asset exists.
18. Preserve the original section order.
19. Use the original text whenever it is available.

Website evidence:

${JSON.stringify(input)}
`;

    console.log(
        "🧩 Generator AI input:",
        JSON.stringify(input).length,
        "characters"
    );

    const response = await runAI(prompt);

    const parsed = JSON.parse(response);
    return enrichReactSpec(parsed, websiteSpec);

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


function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function enrichReactSpec(reactSpec, websiteSpec) {
  const result = {
    ...reactSpec,
    sections: Array.isArray(reactSpec?.sections)
      ? reactSpec.sections.map((section) => ({ ...section }))
      : []
  };

  const sourceSections = websiteSpec?.structure?.sections || [];
  const sourceImages = websiteSpec?.assets?.images || [];

  const findSourceSection = (section) => {
    const heading = String(section?.title || "").trim().toLowerCase();
    if (!heading) return null;

    return sourceSections.find((candidate) => {
      const candidateHeading = String(candidate?.heading || "").trim().toLowerCase();
      return candidateHeading && (
        candidateHeading === heading ||
        candidateHeading.includes(heading) ||
        heading.includes(candidateHeading)
      );
    });
  };

  for (const section of result.sections) {
    const source = findSourceSection(section);
    const media = source?.media || [];

    if (!section.image && media.length) {
      const preferred = media.find((item) => item.role === "large-visual") || media[0];
      section.image = `assets/img-${preferred.assetIndex}`;
      section.imageAspectRatio =
        preferred.width / Math.max(preferred.height, 1) > 1.7
          ? "wide"
          : preferred.width / Math.max(preferred.height, 1) > 1.35
            ? "video"
            : "auto";
    }

    const selectedIndex = String(section.image || "").match(/img-(\d+)/)?.[1];
    const selectedImage = selectedIndex != null
      ? sourceImages[Number(selectedIndex)]
      : null;

    const hasLargeVisual =
      media.some((item) => item.role === "large-visual") ||
      Boolean(selectedImage && (selectedImage.width >= 700 || selectedImage.height >= 450));

    if (hasLargeVisual) {
      if (section.type === "features" && section.image) {
        section.type = "split";
        section.layout = section.layout === "right" ? "split-right" : "split";
      }

      if (section.type === "customers" && section.image) {
        section.type = "showcase";
      }

      section.visual = {
        minHeight: Math.max(
          420,
          Math.min(760, Number(source?.size?.height || 520))
        ),
        contentWidth: Math.min(
          820,
          Math.max(420, Number(source?.size?.width || 900) * 0.46)
        ),
        imageWidth: Math.min(
          1200,
          Math.max(520, Number(selectedImage?.width || 1000))
        ),
        imagePosition:
          section.type === "hero"
            ? "below"
            : section.layout === "split-right"
              ? "left"
              : "right",
        imageOverlap: section.type === "hero" ? 24 : 0,
        spacing: source?.gap || "48px"
      };
    }

    if (section.type === "hero") {
      section.layout = section.image ? "center" : (section.layout || "center");
      section.visual = {
        ...(section.visual || {}),
        minHeight: Math.max(560, Number(source?.size?.height || 650)),
        contentWidth: Math.min(900, Number(section.visual?.contentWidth || 820)),
        imageWidth: Math.min(1180, Number(section.visual?.imageWidth || 1080)),
        imagePosition: section.image ? "below" : "none",
        imageOverlap: Number(section.visual?.imageOverlap || 24)
      };
    }
  }

  return result;
}


function createAppComponent(reactSpec, websiteSpec) {
  const sections = reactSpec.sections || [];

  const getSiteName = () => {
    const title = websiteSpec?.metadata?.title;

    if (title && title.trim()) {
      return title
        .split(/\\||\\s[–—-]\\s/)
        .map((part) => part.trim())
        .filter(Boolean)[0] || title.trim();
    }

    try {
      return new URL(websiteSpec?.metadata?.url).hostname
        .replace("www.", "")
        .split(".")[0];
    } catch {
      return "Website";
    }
  };

  const siteName = getSiteName();

  const slugify = (value = "") =>
    String(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  console.log("🏷️ Generated site name:", siteName);

  const renderButtons = (buttons = []) => {
    if (!buttons || buttons.length === 0) {
      return "";
    }

    return buttons
      .map((button, index) => {
        const text = button.text || button;
        const url = button.url || "#";
        const isExternal = url.startsWith("http") && !url.includes(websiteSpec.metadata?.url || "example.com");
        const target = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
        
        return `
          <a
            href="${escapeHtml(url)}"
            className="${index === 0 ? "primary-btn" : "secondary-btn"}"
            ${target}
          >
            ${escapeHtml(text)}
          </a>
        `;
      })
      .join("");
  };

  const renderItems = (items = []) => {
    if (!items || items.length === 0) {
      return "";
    }

    return items
      .map(
        (item) => `
          <div className="content-card">
            ${
              item.image
                ? `
                  <div className="card-image aspect-${item.imageAspectRatio || "auto"}">
                    <img
                      src="${escapeHtml(
                        resolveImageUrl(item.image, websiteSpec)
                      )}"
                      alt="${escapeHtml(item.title || "")}"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                `
                : ""
            }

            <div className="card-content">
              ${
                item.title
                  ? `<h3>${escapeHtml(item.title)}</h3>`
                  : ""
              }

              ${
                item.description
                  ? `<p>${escapeHtml(item.description)}</p>`
                  : ""
              }
            </div>
          </div>
        `
      )
      .join("");
  };

  const sectionCode = sections
    .map((section, sectionIndex) => {
      const type = section.type || "section";

      const sectionId =
        slugify(section.title) ||
        `${type}-${sectionIndex + 1}`;

      /*
       * NAVBAR
       */
      if (type === "navbar") {
        const navItems = section.navItems || [];

        return `
          <header className="navbar">
            <div className="navbar-inner">

              <a href="#top" className="brand">
                ${escapeHtml(siteName)}
              </a>

              <button
                className="mobile-menu-button"
                onClick={toggleMenu}
                aria-label="Toggle navigation"
              >
                {isMobileMenuOpen ? "✕" : "☰"}
              </button>

              <nav className={"nav-links " + (isMobileMenuOpen ? "open" : "")}>
                ${navItems
                  .map((item) => {
                    const anchor = slugify(item);

                    return `
                      <a
                        href="#${anchor}"
                        onClick={closeMenu}
                      >
                        ${escapeHtml(item)}
                      </a>
                    `;
                  })
                  .join("")}
              </nav>

            </div>
          </header>
        `;
      }

      /*
       * HERO
       */
      if (type === "hero") {
        const imageUrl = resolveImageUrl(
          section.image,
          websiteSpec
        );

        return `
          <section
            id="${sectionId}"
            className="hero layout-${section.layout || "default"} ${section.background ? "has-bg" : ""}"
            style={{
              "--hero-min-height": "${Number(section.visual?.minHeight || 680)}px",
              "--hero-image-width": "${Number(section.visual?.imageWidth || 1120)}px"
            }}
          >
            <div className="hero-content">

              ${
                section.title
                  ? `
                    <h1>
                      ${escapeHtml(section.title)}
                    </h1>
                  `
                  : ""
              }

              ${
                section.description
                  ? `
                    <p className="hero-description">
                      ${escapeHtml(section.description)}
                    </p>
                  `
                  : ""
              }

              <div className="hero-actions">
                ${renderButtons(section.buttons)}
              </div>

            </div>

            ${
              imageUrl
                ? `
                  <div className="hero-image aspect-${section.imageAspectRatio || "auto"}">
                    <img
                      src="${escapeHtml(imageUrl)}"
                      alt="${escapeHtml(section.title || "Hero image")}"
                    />
                  </div>
                `
                : ""
            }

          </section>
        `;
      }

      /*
       * LARGE PRODUCT SHOWCASE
       */
      if (type === "showcase") {
        const imageUrl = resolveImageUrl(section.image, websiteSpec);

        return `
          <section id="${sectionId}" className="showcase-section layout-${section.layout || "center"}">
            <div className="showcase-copy">
              ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
              ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
              <div className="showcase-actions">${renderButtons(section.buttons)}</div>
            </div>

            ${imageUrl ? `
              <div className="showcase-visual">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(section.title || "Product preview")}" />
              </div>
            ` : ""}
          </section>
        `;
      }

      /*
       * TEXT + VISUAL SPLIT
       */
      if (type === "split") {
        const imageUrl = resolveImageUrl(section.image, websiteSpec);
        const reverse = section.layout === "split-right";

        return `
          <section id="${sectionId}" className="split-section ${reverse ? "reverse" : ""}">
            <div className="split-copy">
              ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
              ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
              <div className="split-actions">${renderButtons(section.buttons)}</div>
            </div>

            ${imageUrl ? `
              <div className="split-visual">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(section.title || "Section visual")}" />
              </div>
            ` : ""}
          </section>
        `;
      }

      /*
       * LOGO / BRAND CLOUD
       */
      if (type === "logos") {
        return `
          <section id="${sectionId}" className="logos-section">
            ${section.title ? `<p className="logos-eyebrow">${escapeHtml(section.title)}</p>` : ""}
            <div className="logo-row">
              ${(section.items || []).map((item) => {
                const imageUrl = resolveImageUrl(item.image, websiteSpec);
                return imageUrl
                  ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title || "Logo")}" />`
                  : `<span>${escapeHtml(item.title || "")}</span>`;
              }).join("")}
            </div>
          </section>
        `;
      }

      /*
       * TESTIMONIALS
       */
      if (type === "testimonial") {
        return `
          <section id="${sectionId}" className="testimonial-section">
            ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
            <div className="testimonial-grid">
              ${(section.items || []).map((item) => `
                <article className="testimonial-card">
                  <p className="testimonial-quote">“${escapeHtml(item.description || item.title || "")}”</p>
                  ${item.title ? `<div className="testimonial-author">${escapeHtml(item.title)}</div>` : ""}
                </article>
              `).join("")}
            </div>
          </section>
        `;
      }

      /*
       * SEARCH / FILTER BAR
       */
      if (type === "search") {
        const fields = section.items || [
          { title: "Where", description: "Search destinations" },
          { title: "When", description: "Add dates" },
          { title: "Who", description: "Add guests" }
        ];

        return `
          <section id="${sectionId}" className="search-section">
            <div className="search-bar">
              ${fields.map((field) => `
                <button className="search-field" type="button">
                  <strong>${escapeHtml(field.title || "")}</strong>
                  <span>${escapeHtml(field.description || "")}</span>
                </button>
              `).join("")}
              <button className="search-submit" type="button" aria-label="Search">⌕</button>
            </div>
          </section>
        `;
      }

      /*
       * STATS
       */
      if (type === "stats") {
        return `
          <section
            id="${sectionId}"
            className="section stats-section layout-${section.layout || "default"} cols-${section.columns || 4}"
          >

            ${
              section.title
                ? `
                  <div className="section-heading">
                    <h2>
                      ${escapeHtml(section.title)}
                    </h2>
                  </div>
                `
                : ""
            }

            <div className="stats-grid">
              ${
                (section.items || [])
                  .map(
                    (item) => `
                      <div className="stat-card">

                        ${
                          item.title
                            ? `
                              <div className="stat-value">
                                ${escapeHtml(item.title)}
                              </div>
                            `
                            : ""
                        }

                        ${
                          item.description
                            ? `
                              <p>
                                ${escapeHtml(item.description)}
                              </p>
                            `
                            : ""
                        }

                      </div>
                    `
                  )
                  .join("")
              }
            </div>

          </section>
        `;
      }

      /*
       * FEATURES
       */
      if (type === "features") {
        return `
          <section
            id="${sectionId}"
            className="section features-section layout-${section.layout || "default"} cols-${section.columns || 3}"
          >

            ${
              section.title
                ? `
                  <div className="section-heading">
                    <h2>
                      ${escapeHtml(section.title)}
                    </h2>
                  </div>
                `
                : ""
            }

            <div className="features-grid">
              ${renderItems(section.items)}
            </div>

          </section>
        `;
      }

      /*
       * CUSTOMERS
       */
      if (type === "customers") {
        return `
          <section
            id="${sectionId}"
            className="section customers layout-${section.layout || "default"} cols-${section.columns || 3}"
          >

            ${
              section.title
                ? `
                  <div className="section-heading">
                    <h2>
                      ${escapeHtml(section.title)}
                    </h2>
                  </div>
                `
                : ""
            }

            <div className="customers-grid">
              ${renderItems(section.items)}
            </div>

          </section>
        `;
      }

      /*
       * RESOURCES
       */
      if (type === "resources") {
        return `
          <section
            id="${sectionId}"
            className="section resources layout-${section.layout || "default"} cols-${section.columns || 3}"
          >

            ${
              section.title
                ? `
                  <div className="section-heading">
                    <h2>
                      ${escapeHtml(section.title)}
                    </h2>
                  </div>
                `
                : ""
            }

            <div className="resources-grid">
              ${renderItems(section.items)}
            </div>

          </section>
        `;
      }

      /*
       * CTA
       */
      if (type === "cta") {
        return `
          <section
            id="${sectionId}"
            className="cta"
          >

            ${
              section.title
                ? `
                  <h2>
                    ${escapeHtml(section.title)}
                  </h2>
                `
                : ""
            }

            ${
              section.description
                ? `
                  <p>
                    ${escapeHtml(section.description)}
                  </p>
                `
                : ""
            }

            <div className="cta-actions">
              ${renderButtons(section.buttons)}
            </div>

          </section>
        `;
      }

      /*
       * FOOTER
       */
      if (type === "footer") {
        const links = section.navItems || [];

        return `
          <footer className="footer">

            <div className="footer-inner">

              <div className="footer-brand">
                ${escapeHtml(siteName)}
              </div>

              <div className="footer-links">

                ${links
                  .map(
                    (link) => `
                      <a
                        href="#${slugify(link)}"
                        onClick={closeMenu}
                      >
                        ${escapeHtml(link)}
                      </a>
                    `
                  )
                  .join("")}

              </div>

            </div>

          </footer>
        `;
      }

      /*
       * FALLBACK SECTION
       */
      return `
        <section
          id="${sectionId}"
          className="section generic-section layout-${section.layout || "default"}"
        >

          ${
            section.title
              ? `
                <h2>
                  ${escapeHtml(section.title)}
                </h2>
              `
              : ""
          }

          ${
            section.description
              ? `
                <p>
                  ${escapeHtml(section.description)}
                </p>
              `
              : ""
          }

          ${renderItems(section.items)}

        </section>
      `;
    })
    .join("\n");

  /*
   * IMPORTANT:
   * This template generates the final App.jsx.
   *
   * The \${...} below must remain escaped because
   * isMobileMenuOpen is a variable inside the GENERATED
   * React application, not inside this generator.
   */
  return `
import React, { useState } from "react";
import "./styles.css";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

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

export async function generateStylesFile(reactSpec) {
    const theme = reactSpec?.theme || {};
    const fontFamily = theme.fontFamily || "system-ui, sans-serif";
    const primaryColor = theme.primaryColor || "#635bff";
    const secondaryColor = theme.secondaryColor || "#f6f9fc";
    const textColor = theme.textColor || "#0a2540";
    const backgroundColor = theme.backgroundColor || "#ffffff";

    const styles = `
:root {
  --primary-color: ${primaryColor};
  --secondary-color: ${secondaryColor};
  --text-color: ${textColor};
  --background-color: ${backgroundColor};
  --font-family: ${fontFamily};
  --max-width: 1280px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font-family);
  color: var(--text-color);
  background: var(--background-color);
}
button, a { font: inherit; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
.app { width: 100%; min-height: 100vh; overflow-x: hidden; }

/* Navbar */
.navbar {
  width: 100%;
  padding: 18px 5%;
  position: relative;
  z-index: 20;
  background: var(--background-color);
}
.navbar-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
}
.brand { font-size: 22px; font-weight: 700; }
.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
  font-size: 14px;
}
.nav-links a { opacity: .8; transition: opacity .2s ease; }
.nav-links a:hover { opacity: 1; }
.mobile-menu-button {
  display: none;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  padding: 8px;
}

/* Shared sections */
.section, .hero, .cta, .footer {
  width: 100%;
  padding: 80px 5%;
}
.section-heading {
  max-width: 800px;
  margin: 0 auto 50px;
  text-align: center;
}
.section-heading h2, .cta h2 {
  margin: 0 0 20px;
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.1;
  letter-spacing: -.02em;
}
.section-heading p, .cta p {
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
  opacity: .75;
}
.layout-full { max-width: 100%; }
.layout-center { display: flex; flex-direction: column; align-items: center; text-align: center; }
.layout-split {
  display: grid;
  grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  gap: 60px;
  align-items: center;
  max-width: var(--max-width);
  margin: 0 auto;
}
.layout-wide { max-width: 1600px; margin: 0 auto; }
.layout-default { max-width: var(--max-width); margin: 0 auto; }
.has-bg { background: var(--secondary-color); }

/* Search */
.search-section {
  width: 100%;
  padding: 10px 5% 34px;
  display: flex;
  justify-content: center;
}
.search-bar {
  width: min(820px, 100%);
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr auto;
  align-items: center;
  background: #fff;
  border: 1px solid rgba(0,0,0,.12);
  border-radius: 999px;
  box-shadow: 0 8px 28px rgba(0,0,0,.12);
  overflow: hidden;
}
.search-field {
  min-height: 66px;
  padding: 12px 24px;
  text-align: left;
  border: 0;
  border-right: 1px solid rgba(0,0,0,.12);
  background: transparent;
  cursor: pointer;
}
.search-field strong, .search-field span {
  display: block;
}
.search-field strong { font-size: 13px; }
.search-field span { margin-top: 4px; color: #666; font-size: 14px; }
.search-submit {
  width: 52px;
  height: 52px;
  margin: 7px;
  border: 0;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  font-size: 25px;
  cursor: pointer;
}

/* Hero */
.hero {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-content { width: 100%; max-width: 760px; }
.hero h1 {
  margin: 0 0 24px;
  font-size: clamp(40px, 6vw, 72px);
  line-height: 1.05;
  letter-spacing: -.03em;
  font-weight: 600;
}
.hero-description {
  margin: 0 0 32px;
  max-width: 680px;
  font-size: 20px;
  line-height: 1.55;
  opacity: .8;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.hero-image {
  width: min(100%, 620px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-image img {
  width: 100%;
  max-height: 520px;
  object-fit: contain;
}

/* Visual reconstruction components */
.hero.layout-center {
  flex-direction: column;
  text-align: center;
  gap: clamp(44px, 6vw, 88px);
  min-height: var(--hero-min-height, 680px);
}
.hero.layout-center .hero-content {
  max-width: min(900px, 92vw);
}
.hero.layout-center .hero-description {
  margin-left: auto;
  margin-right: auto;
  max-width: 720px;
}
.hero.layout-center .hero-actions {
  justify-content: center;
}
.hero.layout-center .hero-image {
  width: min(var(--hero-image-width, 1120px), 92vw);
  max-width: none;
  margin-top: 8px;
}
.hero.layout-center .hero-image img {
  width: 100%;
  max-height: none;
  object-fit: contain;
  border-radius: 18px;
  box-shadow: 0 30px 100px rgba(0,0,0,.22);
}

.showcase-section,
.split-section,
.logos-section,
.testimonial-section {
  width: min(var(--max-width), 92vw);
  margin: 0 auto;
}

.showcase-section {
  padding: 110px 0 130px;
  text-align: center;
}
.showcase-copy {
  max-width: 780px;
  margin: 0 auto 58px;
}
.showcase-copy h2,
.split-copy h2,
.testimonial-section h2 {
  margin: 0 0 18px;
  font-size: clamp(34px, 5vw, 62px);
  line-height: 1.02;
  letter-spacing: -.04em;
}
.showcase-copy p,
.split-copy p {
  margin: 0 auto;
  max-width: 680px;
  font-size: 18px;
  line-height: 1.65;
  opacity: .72;
}
.showcase-actions,
.split-actions {
  margin-top: 28px;
}
.showcase-visual {
  width: min(1180px, 94vw);
  margin: 0 auto;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(127,127,127,.18);
  box-shadow: 0 40px 120px rgba(0,0,0,.28);
  background: rgba(127,127,127,.06);
}
.showcase-visual img {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.split-section {
  display: grid;
  grid-template-columns: minmax(0, .82fr) minmax(0, 1.18fr);
  align-items: center;
  gap: clamp(48px, 7vw, 110px);
  padding: 120px 0;
}
.split-section.reverse .split-copy { order: 2; }
.split-section.reverse .split-visual { order: 1; }
.split-copy h2 {
  font-size: clamp(34px, 4.6vw, 58px);
}
.split-visual {
  min-width: 0;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(127,127,127,.18);
  box-shadow: 0 28px 90px rgba(0,0,0,.2);
}
.split-visual img {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.logos-section {
  padding: 80px 0;
  text-align: center;
}
.logos-eyebrow {
  margin: 0 0 34px;
  font-size: 14px;
  opacity: .62;
  letter-spacing: .04em;
}
.logo-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: clamp(28px, 5vw, 70px);
}
.logo-row img {
  width: auto;
  max-width: 150px;
  max-height: 42px;
  object-fit: contain;
  filter: grayscale(1);
  opacity: .72;
}
.logo-row span {
  font-size: 18px;
  font-weight: 600;
  opacity: .72;
}

.testimonial-section {
  padding: 120px 0;
}
.testimonial-section h2 {
  text-align: center;
  margin-bottom: 52px;
}
.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.testimonial-card {
  min-height: 260px;
  padding: 32px;
  border: 1px solid rgba(127,127,127,.16);
  border-radius: 20px;
  background: rgba(127,127,127,.045);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.testimonial-quote {
  margin: 0;
  font-size: clamp(18px, 2vw, 25px);
  line-height: 1.4;
  letter-spacing: -.015em;
}
.testimonial-author {
  margin-top: 28px;
  font-size: 14px;
  font-weight: 600;
  opacity: .68;
}

/* Buttons */
.primary-btn, .secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 12px 22px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform .15s ease, filter .15s ease, background .15s ease;
}
.primary-btn {
  background: var(--primary-color);
  color: #fff;
}
.primary-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
.secondary-btn {
  background: transparent;
  color: var(--text-color);
  border-color: currentColor;
}
.secondary-btn:hover { background: rgba(0,0,0,.05); }

/* Content grids */
.features-grid, .stats-grid, .customers-grid, .resources-grid {
  display: grid;
  gap: 28px;
  width: 100%;
}
.features-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
.stats-grid { grid-template-columns: repeat(4, minmax(0,1fr)); }
.customers-grid, .resources-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
.cols-1 { grid-template-columns: 1fr; }
.cols-2 { grid-template-columns: repeat(2, minmax(0,1fr)); }
.cols-3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
.cols-4 { grid-template-columns: repeat(4, minmax(0,1fr)); }

/* Cards */
.content-card {
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--secondary-color);
  border-radius: 16px;
}
.card-image {
  width: 100%;
  overflow: hidden;
  background: rgba(0,0,0,.04);
}
.card-image img { width: 100%; height: auto; object-fit: cover; }
.card-image.aspect-square { aspect-ratio: 1 / 1; }
.card-image.aspect-video { aspect-ratio: 16 / 9; }
.card-image.aspect-wide { aspect-ratio: 21 / 9; }
.card-image.aspect-square img,
.card-image.aspect-video img,
.card-image.aspect-wide img { width: 100%; height: 100%; object-fit: cover; }
.card-content { padding: 26px; flex: 1; }
.card-content h3 { margin: 0 0 10px; font-size: 20px; line-height: 1.25; }
.card-content p { margin: 0; line-height: 1.55; opacity: .75; }

/* Stats */
.stat-card { padding: 24px; text-align: center; }
.stat-value { font-size: clamp(28px, 3vw, 44px); font-weight: 700; line-height: 1.15; color: var(--primary-color); }

/* CTA */
.cta {
  max-width: var(--max-width);
  margin: 60px auto;
  border-radius: 24px;
  background: var(--primary-color);
  color: #fff;
  text-align: center;
}
.cta .cta-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 30px;
}
.cta .secondary-btn { color: #fff; border-color: rgba(255,255,255,.55); }
.cta .secondary-btn:hover { background: rgba(255,255,255,.1); }

/* Footer */
.footer { background: var(--secondary-color); margin-top: auto; }
.footer-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 40px;
}
.footer-brand { font-size: 22px; font-weight: 700; }
.footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
.footer-links a { opacity: .75; }
.footer-links a:hover { opacity: 1; }

/* Responsive */
@media (max-width: 1024px) {
  .features-grid, .stats-grid, .customers-grid, .resources-grid {
    grid-template-columns: repeat(2, minmax(0,1fr));
  }
  .layout-split { grid-template-columns: 1fr; gap: 40px; }
}
@media (max-width: 768px) {
  .section, .hero, .cta, .footer { padding: 56px 5%; }
  .mobile-menu-button { display: block; }
  .nav-links {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    max-height: 0;
    overflow: hidden;
    padding: 0;
    background: var(--background-color);
    box-shadow: 0 12px 24px rgba(0,0,0,.08);
    transition: max-height .25s ease, padding .25s ease;
  }
  .nav-links.open { max-height: 520px; padding: 12px 0; }
  .nav-links a {
    width: 100%;
    padding: 12px 5%;
    text-align: center;
    border-bottom: 1px solid rgba(0,0,0,.06);
  }
  .search-bar {
    grid-template-columns: 1fr;
    border-radius: 22px;
  }
  .search-field {
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid rgba(0,0,0,.08);
  }
  .search-submit {
    width: calc(100% - 14px);
    border-radius: 14px;
  }
  .showcase-section,
  .split-section,
  .logos-section,
  .testimonial-section {
    width: 90%;
  }
  .showcase-section,
  .split-section,
  .testimonial-section {
    padding-top: 72px;
    padding-bottom: 80px;
  }
  .split-section {
    grid-template-columns: 1fr;
    gap: 42px;
  }
  .split-section.reverse .split-copy,
  .split-section.reverse .split-visual {
    order: initial;
  }
  .testimonial-grid {
    grid-template-columns: 1fr;
  }
  .hero.layout-center {
    min-height: 620px;
  }

  .hero { min-height: auto; }
  .hero h1 { font-size: clamp(38px, 12vw, 58px); }
  .hero-description { font-size: 17px; }
  .hero-actions { justify-content: center; }
  .features-grid, .stats-grid, .customers-grid, .resources-grid {
    grid-template-columns: 1fr;
  }
  .cta { margin: 24px 5%; }
  .footer-links { flex-direction: column; gap: 12px; }
}
`;

    await writeGeneratedFile("src/styles.css", styles);
    return styles;
}


// ============================================================
// 7. Generate index.html
// ============================================================

export async function generateIndexFile(websiteSpec = {}) {
    const title = websiteSpec?.metadata?.title || "Generated Website";

    const indexCode = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

    await writeGeneratedFile("index.html", indexCode);
    return indexCode;
}


// ============================================================
// 8. Generate package.json
// ============================================================

export async function generatePackageFile() {
    const packageCode = `{
  "name": "soulclone-generated-site",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.4",
    "vite": "^7.1.7"
  }
}
`;

    await writeGeneratedFile("package.json", packageCode);
    return packageCode;
}
