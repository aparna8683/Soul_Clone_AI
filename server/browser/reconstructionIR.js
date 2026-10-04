const MAX_NODES = 260;

/** Capture a bounded, visible DOM tree with browser-computed layout evidence. */
export async function extractReconstructionIR(page) {
    return page.evaluate((maxNodes) => {
        const clean = (value, limit = 180) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
        const ignored = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG"]);
        const rectOf = (el) => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y + scrollY), width: Math.round(r.width), height: Math.round(r.height) };
        };
        const visible = (el) => {
            const s = getComputedStyle(el), r = el.getBoundingClientRect();
            return !ignored.has(el.tagName) && s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) !== 0 && r.width > 1 && r.height > 1;
        };
        const semantic = (el) => {
            const tag = el.tagName.toLowerCase(), role = el.getAttribute("role");
            if (role) return role;
            if (["header", "nav", "main", "footer", "aside", "article", "section"].includes(tag)) return tag;
            if (/^h[1-6]$/.test(tag)) return "heading";
            if (tag === "a") return "link";
            if (tag === "button") return "button";
            if (tag === "img" || tag === "picture" || tag === "video" || tag === "canvas") return "media";
            return "content";
        };
        const nodes = [];
        const nodeById = new Map();
        const roots = [];
        const body = document.querySelector("body");
        const priorityAncestors = new Set();
        for (const target of document.querySelectorAll("header, nav, main, footer, h1, h2, button, img, [role='main'], [role='navigation']")) {
            for (let current = target; current && current !== body; current = current.parentElement) priorityAncestors.add(current);
        }
        const queue = body ? Array.from(body.children, (el) => ({ el, parentId: null })) : [];
        // Breadth-first traversal gives body-level portals (often a fixed header
        // or consent UI) a slot before a large app subtree consumes the cap.
        while (queue.length && nodes.length < maxNodes) {
            const { el, parentId } = queue.shift();
            if (!visible(el)) continue;
            const style = getComputedStyle(el), box = rectOf(el), id = `n${nodes.length}`;
            const text = clean(el.children.length ? Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(" ") : el.textContent, 240);
            const src = el.currentSrc || el.src || null;
            const node = {
                id, parentId, children: [], tag: el.tagName.toLowerCase(), role: semantic(el), box,
                display: style.display, position: style.position, transform: style.transform,
                inset: { top: style.top, right: style.right, bottom: style.bottom, left: style.left },
                textAlign: style.textAlign, boxSizing: style.boxSizing,
                layout: { flexDirection: style.flexDirection, flexWrap: style.flexWrap, justifyContent: style.justifyContent, alignItems: style.alignItems, gridTemplateColumns: style.gridTemplateColumns, gap: style.gap },
                spacing: { padding: style.padding, margin: style.margin },
                dimensions: { width: style.width, maxWidth: style.maxWidth, height: style.height, minHeight: style.minHeight },
                typography: { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, color: style.color, textTransform: style.textTransform, textDecoration: style.textDecoration },
                surface: { backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, border: style.border, borderRadius: style.borderRadius, boxShadow: style.boxShadow, opacity: style.opacity, overflow: style.overflow, zIndex: style.zIndex, backdropFilter: style.backdropFilter },
                text: text || null, href: el.href || null,
                image: el.tagName === "IMG" ? { src, currentSrc: el.currentSrc || null, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, objectFit: style.objectFit, objectPosition: style.objectPosition, alt: el.alt || null } : null
            };
            nodes.push(node);
            nodeById.set(id, node);
            if (parentId) nodeById.get(parentId)?.children.push(id);
            else roots.push(id);
            for (const child of el.children) queue.push({ el: child, parentId: id });
            queue.sort((a, b) => Number(priorityAncestors.has(b.el)) - Number(priorityAncestors.has(a.el)));
        }
        return { version: 1, viewport: { width: innerWidth, height: innerHeight }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, roots, nodes };
    }, MAX_NODES);
}
