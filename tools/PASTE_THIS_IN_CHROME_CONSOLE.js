/**
 * Base44 Monaco Export Helper (Breadcrumb-first, SAFE)
 * - Only accept breadcrumb paths under: Pages/ , Components/ , Entities/
 * - Reject any candidate containing: "<" ">" "http" "iframe" "script"
 * - Wait breadcrumb stable (700ms)
 * - Extract code from Monaco active/visible model
 * - Copy to clipboard:
 *    FILE: Pages/AdminProducts.tsx
 *    <code...>
 */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const now = () => Date.now();

  function isGarbageText(t) {
    const s = (t || "").toLowerCase();
    if (!s) return true;
    if (s.includes("<") || s.includes(">")) return true;
    if (s.includes("http://") || s.includes("https://")) return true;
    if (s.includes("iframe") || s.includes("script")) return true;
    return false;
  }

  function normalizePathFromBreadcrumbText(text) {
    if (!text) return "";
    if (isGarbageText(text)) return "";

    let t = (text || "").replace(/\s+/g, " ").trim();
    // common breadcrumb separators
    t = t.replace(/\s*\/\s*/g, "/");
    t = t.replace(/^\//, "").replace(/\/$/, "");
    if (!t) return "";

    // accept only root folders
    if (!/^(Pages|Components|Entities)\//i.test(t)) return "";

    const parts = t.split("/").filter(Boolean);
    if (!parts.length) return "";

    const last = parts[parts.length - 1];
    const hasExt = /\.[A-Za-z0-9]+$/.test(last);
    if (!hasExt) parts[parts.length - 1] = last + ".tsx";

    const joined = parts.join("/");

    // final strict: allow only safe chars
    if (!/^(Pages|Components|Entities)\/[A-Za-z0-9_\-./]+$/.test(joined)) return "";
    return joined;
  }

  function collectTopCandidates() {
    const candidates = [];
    const push = (txt, why) => {
      const t = (txt || "").trim();
      if (!t) return;
      candidates.push({ txt: t.replace(/\s+/g, " "), why });
    };

    // Strong selectors first
    const crumbEls = Array.from(document.querySelectorAll(
      '[aria-label*="Breadcrumb" i], [role="navigation"][aria-label*="breadcrumb" i], [class*="breadcrumb" i], [data-testid*="breadcrumb" i]'
    ));
    for (const el of crumbEls) push(el.innerText || "", "breadcrumb-like element");

    // Header/top zone scan
    const all = Array.from(document.querySelectorAll("body *"));
    for (const el of all) {
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r) continue;
      if (r.top < 0 || r.top > 300) continue;
      if (r.height > 120) continue;

      const txt = (el.innerText || "").trim();
      if (!txt) continue;
      if (txt.includes(" / ") || txt.match(/\b(Pages|Components|Entities)\b/i)) {
        push(txt, "top-zone scan");
      }
    }

    // Unique keep order
    const seen = new Set();
    const uniq = [];
    for (const c of candidates) {
      const k = c.txt;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(c);
    }
    return uniq.slice(0, 30);
  }

  async function getStableBreadcrumbPath(timeoutMs = 12000, stableMs = 700) {
    const t0 = now();
    let last = "";
    let lastChangeAt = now();

    while (now() - t0 < timeoutMs) {
      const cand = collectTopCandidates();
      const normalized = [];

      for (const c of cand) {
        const p = normalizePathFromBreadcrumbText(c.txt);
        if (p) normalized.push({ path: p, why: c.why, raw: c.txt });
      }

      // pick first best
      const best = normalized.length ? normalized[0].path : "";

      if (best && best !== last) {
        last = best;
        lastChangeAt = now();
        console.log("[Base44Export] Candidate breadcrumb path:", best);
      }

      if (last && (now() - lastChangeAt) >= stableMs) {
        return last;
      }

      await sleep(120);
    }
    return "";
  }

  function getMonaco() {
    const m = window.monaco;
    if (!m || !m.editor || !m.editor.getModels) return null;
    return m;
  }

  function pickBestModel(monaco, hintPath) {
    const models = monaco.editor.getModels();
    if (!models || !models.length) return null;

    const lastSeg = (hintPath || "").split("/").pop() || "";
    if (lastSeg) {
      const hit = models.find(md => {
        try {
          const uri = md.uri ? (md.uri.path || md.uri.toString()) : "";
          return uri && uri.toLowerCase().includes(lastSeg.toLowerCase());
        } catch { return false; }
      });
      if (hit) return hit;
    }

    try {
      const editors = monaco.editor.getEditors ? monaco.editor.getEditors() : null;
      if (editors && editors.length) {
        const focused = editors.find(ed => {
          try {
            const dom = ed.getDomNode ? ed.getDomNode() : null;
            if (!dom) return false;
            const r = dom.getBoundingClientRect();
            return r.width > 50 && r.height > 50;
          } catch { return false; }
        });
        if (focused && focused.getModel) {
          const m = focused.getModel();
          if (m) return m;
        }
      }
    } catch {}

    // biggest content fallback
    const sorted = models.slice().sort((a,b) => {
      const al = a.getValueLength ? a.getValueLength() : (a.getValue()?.length||0);
      const bl = b.getValueLength ? b.getValueLength() : (b.getValue()?.length||0);
      return bl - al;
    });
    return sorted[0] || models[0];
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  console.log("[Base44Export] Starting...");

  const breadcrumbPath = await getStableBreadcrumbPath();
  if (!breadcrumbPath) {
    console.log("[Base44Export][FAIL] Breadcrumb stable path not found (or rejected as garbage).");
    console.log("[Base44Export] Make sure breadcrumb looks like: Pages / AdminProducts");
    return;
  }

  const monaco = getMonaco();
  if (!monaco) {
    console.log("[Base44Export][FAIL] window.monaco.editor.getModels() not found.");
    return;
  }

  const model = pickBestModel(monaco, breadcrumbPath);
  if (!model || !model.getValue) {
    console.log("[Base44Export][FAIL] Monaco model not found.");
    return;
  }

  const code = model.getValue();
  if (!code || !code.trim()) {
    console.log("[Base44Export][FAIL] Model code empty.");
    return;
  }

  const payload = `FILE: ${breadcrumbPath}\n${code}\n`;
  const ok = await copyToClipboard(payload);

  console.log("[Base44Export] File:", breadcrumbPath);
  console.log("[Base44Export] Code length:", code.length);
  console.log("[Base44Export] Clipboard:", ok ? "OK" : "FAILED");
})();