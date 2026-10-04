const MAX_NODES = 600;

/**
 * Entrance animations run while the page is being analyzed, so computed
 * styles sampled mid-flight (e.g. opacity 0.05 of a fade-in) get frozen
 * into the clone. Fast-forward every running animation to its end state
 * and let the browser recompute before anything is extracted.
 */
export async function settleAnimations(page) {
    await page.evaluate(() => {
        for (const animation of document.getAnimations({ subtree: true })) {
            try { animation.finish(); } catch { /* infinite animations cannot finish */ }
        }
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
}

/**
 * Capture a bounded, visible DOM tree with browser-computed layout evidence.
 *
 * The traversal is a priority BFS: elements in the near-fold band (the first
 * 1.5 viewport heights) and semantic/text-bearing elements claim the node
 * budget first, so dense pages spend slots on what the user actually sees.
 * Box-less wrappers (display:contents or zero-size with non-clipping
 * overflow) create no node but pass their children through, because fixed or
 * absolutely positioned children can still paint outside them.
 */
export async function extractReconstructionIR(page) {
    return page.evaluate((maxNodes) => {
        const clean = (value, limit = 180) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
        const ignored = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG"]);
        const rectOf = (el) => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y + scrollY), width: Math.round(r.width), height: Math.round(r.height) };
        };
        const styleHidden = (el) => {
            const s = getComputedStyle(el);
            return s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0;
        };
        const bandLimit = innerHeight * 1.5;
        const inBand = (el) => {
            const r = el.getBoundingClientRect();
            const top = r.top + scrollY;
            return top < bandLimit && top + r.height > 0 && r.width > 1 && r.height > 1;
        };
        const semantic = (el) => {
            const tag = el.tagName.toLowerCase(), role = el.getAttribute("role");
            if (role) return role;
            if (["header", "nav", "main", "footer", "aside", "article", "section"].includes(tag)) return tag;
            if (/^h[1-6]$/.test(tag)) return "heading";
            if (tag === "a") return "link";
            if (tag === "button") return "button";
            if (tag === "img" || tag === "picture" || tag === "video" || tag === "canvas" || tag === "iframe") return "media";
            return "content";
        };
        const nodes = [];
        const nodeById = new Map();
        const capturedElements = [];
        const roots = [];
        const body = document.querySelector("body");
        const priorityAncestors = new Set();
        for (const target of document.querySelectorAll("header, nav, main, footer, section, h1, h2, h3, a, button, img, [role='main'], [role='navigation']")) {
            for (let current = target; current && current !== body; current = current.parentElement) priorityAncestors.add(current);
        }
        // Text-bearing leaves (link labels, list items, paragraphs) carry most
        // of a page's content; boost them and their ancestors so the node cap
        // does not spend the whole budget on structural wrappers.
        for (const target of document.querySelectorAll("p, span, li, label, strong, em, small, td, th, figcaption, blockquote")) {
            if (target.children.length === 0 && (target.textContent || "").trim().length > 0 && (target.textContent || "").trim().length <= 200) {
                for (let current = target; current && current !== body; current = current.parentElement) priorityAncestors.add(current);
            }
        }
        // Band membership is worth more than semantic priority below the fold:
        // the viewport is what similarity is measured on and what users see.
        const scoreOf = (el) => (inBand(el) ? 2 : 0) + (priorityAncestors.has(el) ? 1 : 0);
        const enqueueChildren = (el, parentId) => {
            for (const child of el.children) queue.push({ el: child, parentId, score: scoreOf(child) });
            queue.sort((a, b) => b.score - a.score);
        };
        const queue = body ? Array.from(body.children, (el) => ({ el, parentId: null, score: scoreOf(el) })) : [];
        queue.sort((a, b) => b.score - a.score);
        while (queue.length && nodes.length < maxNodes) {
            const { el, parentId } = queue.shift();
            if (ignored.has(el.tagName) || styleHidden(el)) continue;
            const box = rectOf(el);
            if (box.width <= 1 || box.height <= 1) {
                // Box-less wrapper. When it cannot clip (display:contents has no
                // box; overflow:visible lets children paint outside), its
                // children may still be visible — pass them through without
                // spending a node slot on the wrapper itself.
                const s = getComputedStyle(el);
                if (s.display === "contents" || s.overflow === "visible") enqueueChildren(el, parentId);
                continue;
            }
            const style = getComputedStyle(el), id = `n${nodes.length}`;
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
                surface: { backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, backgroundSize: style.backgroundSize, backgroundRepeat: style.backgroundRepeat, backgroundPosition: style.backgroundPosition, backgroundBlendMode: style.backgroundBlendMode, mixBlendMode: style.mixBlendMode, border: style.border, borderRadius: style.borderRadius, boxShadow: style.boxShadow, opacity: style.opacity, overflow: style.overflow, zIndex: style.zIndex, backdropFilter: style.backdropFilter, backgroundClip: style.backgroundClip, webkitBackgroundClip: style.webkitBackgroundClip },
                text: text || null, href: el.href || null,
                image: el.tagName === "IMG" ? { src, currentSrc: el.currentSrc || null, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, objectFit: style.objectFit, objectPosition: style.objectPosition, alt: el.alt || null } : null
            };
            nodes.push(node);
            capturedElements.push({ el, node });
            nodeById.set(id, node);
            if (parentId) nodeById.get(parentId)?.children.push(id);
            else roots.push(id);
            enqueueChildren(el, id);
        }
        // The node cap prunes whole subtrees, which orphans the words inside
        // captured containers (e.g. a heading whose inner spans lost their
        // slots). Re-attach that text: a captured element with no captured
        // children absorbs its full text content, bounded so large containers
        // do not collapse into one text blob.
        for (const { el, node } of capturedElements) {
            if ((node.children || []).length) continue;
            const raw = (el.textContent || "").replace(/\s+/g, " ").trim();
            if (raw && raw.length <= 400) node.text = raw.slice(0, 240);
        }
        // The priority queue captures siblings out of document order, but
        // paint order follows DOM order: a solid background layer captured
        // after the content it sits behind would otherwise render on top of
        // it. Restore the true document order for every children list.
        const elementOf = new Map(capturedElements.map(({ el, node }) => [node.id, el]));
        const byDocumentOrder = (aId, bId) => {
            const a = elementOf.get(aId), b = elementOf.get(bId);
            if (!a || !b) return 0;
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        };
        for (const node of nodes) {
            if (node.children.length > 1) node.children.sort(byDocumentOrder);
        }
        if (roots.length > 1) roots.sort(byDocumentOrder);
        return { version: 1, viewport: { width: innerWidth, height: innerHeight }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, roots, nodes };
    }, MAX_NODES);
}
