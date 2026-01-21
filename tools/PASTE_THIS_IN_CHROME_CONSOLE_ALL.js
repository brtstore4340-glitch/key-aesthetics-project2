/**
 * Base44 Export ALL (TARGET LIST) - NO SIDEBAR CLICK
 * Strategy: Quick Open (Ctrl+P) -> type path -> Enter -> breadcrumb stable -> export Monaco model
 *
 * Why this is correct:
 * - You said "ต้องให้วิ่งไป คลิกที่ไฟล์นี้" = ต้องเปิดไฟล์ตามชื่อที่กำหนด
 * - DOM sidebar จับไม่ชัวร์ => เราเลิกพึ่ง sidebar, เปิดไฟล์ด้วยชื่อแทน (ชัวร์กว่า)
 *
 * Output:
 * - If small => Clipboard
 * - If large => download parts base44_export_partXXX.txt
 */
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const now = () => Date.now();

  const MAX_CLIPBOARD_CHARS = 900000;
  const PART_SIZE = 800000;

  const TARGETS_RAW = [
    "\\Pages",
   "\\Pages\\AdminDashboard",
    "\\Pages\\AdminProducts",
    "\\Pages\\AdminUsers",
    "\\Pages\\CreateOrder",
    "\\Pages\\StaffDashboard",
    "\\Pages\\StaffOrders",
    "\\Pages\\StaffSelection",
    "\\Components",
    "\\Components\\UserNotRegisteredError",
    "\\Components\\ui",
    "\\Components\\ui\\avatar",
    "\\Components\\ui\\aspect-ratio",
    "\\Components\\ui\\alert",
    "\\Components\\ui\\dropdown-menu",
    "\\Components\\ui\\sonner",
    "\\Components\\ui\\toast",
    "\\Components\\ui\\command",
    "\\Components\\ui\\pagination",
    "\\Components\\ui\\textarea",
    "\\Components\\ui\\radio-group",
    "\\Components\\ui\\switch",
    "\\Components\\ui\\menubar",
    "\\Components\\ui\\card",
    "\\Components\\ui\\label",
    "\\Components\\ui\\input",
    "\\Components\\ui\\badge",
    "\\Components\\ui\\resizable",
    "\\Components\\ui\\tooltip",
    "\\Components\\ui\\checkbox",
    "\\Components\\ui\\table",
    "\\Components\\ui\\dialog",
    "\\Components\\ui\\progress",
    "\\Components\\ui\\input-otp",
    "\\Components\\ui\\popover",
    "\\Components\\ui\\hover-card",
    "\\Components\\ui\\breadcrumb",
    "\\Components\\ui\\calendar",
    "\\Components\\ui\\toggle-group",
    "\\Components\\ui\\use-toast",
    "\\Components\\ui\\slider",
    "\\Components\\ui\\sidebar",
    "\\Components\\ui\\chart",
    "\\Components\\ui\\carousel",
    "\\Components\\ui\\tabs",
    "\\Components\\ui\\sheet",
    "\\Components\\ui\\scroll-area",
    "\\Components\\ui\\drawer",
    "\\Components\\ui\\button",
    "\\Components\\ui\\collapsible",
    "\\Components\\ui\\toaster",
    "\\Components\\ui\\navigation-menu",
    "\\Components\\ui\\alert-dialog",
    "\\Components\\ui\\select",
    "\\Components\\ui\\separator",
    "\\Components\\ui\\context-menu",
    "\\Components\\ui\\skeleton",
    "\\Components\\ui\\form",
    "\\Components\\ui\\toggle",
    "\\Components\\ui\\accordion",
    "\\Components\\ui\\FloatingParticles",
    "\\Components\\ui\\GlassButton",
    "\\Components\\ui\\GlassCard",
    "\\Components\\ui\\GlassInput",
    "\\Components\\ui\\GlassUpload",
    "\\Components\\auth",
    "\\Components\\auth\\PinPad",
    "\\Components\\auth\\UserGrid",
    "\\Components\\layout",
    "\\Components\\layout\\DashboardLayout",
    "\\Entities",
    "\\Entities\\ProductCategory",
    "\\Entities\\Product",
    "\\Entities\\Order"
  ];

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function isFolderLike(p) {
    // In your list, entries like "\Pages" "\Components\ui" look like folders.
    // We will still try opening candidates, but folder-like usually has no file extension.
    return !/\.[A-Za-z0-9]+$/.test(p);
  }

  function normalizeTarget(p) {
    let t = (p || "").trim();
    if (!t) return "";
    t = t.replace(/\\/g, "/");
    t = t.replace(/^\/+/, ""); // drop leading slashes
    return t;
  }

  function candidatePaths(t) {
    // Try multiple common patterns
    // 1) as given (maybe Base44 maps folder-node to file)
    // 2) add extensions
    // 3) index.tsx in folder
    const out = [];
    const hasExt = /\.[A-Za-z0-9]+$/.test(t);

    if (hasExt) {
      out.push(t);
      return uniq(out);
    }

    out.push(t);
    out.push(`${t}.tsx`);
    out.push(`${t}.ts`);
    out.push(`${t}.jsx`);
    out.push(`${t}.js`);
    out.push(`${t}/index.tsx`);
    out.push(`${t}/index.ts`);
    out.push(`${t}/index.jsx`);
    out.push(`${t}/index.js`);
    return uniq(out);
  }

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
    let x = (text || "").replace(/\s+/g, " ").trim();
    x = x.replace(/\s*\/\s*/g, "/");
    x = x.replace(/^\//, "").replace(/\/$/, "");
    if (!x) return "";
    if (!/^(Pages|Components|Entities)\//i.test(x)) return "";

    const parts = x.split("/").filter(Boolean);
    if (!parts.length) return "";
    const last = parts[parts.length - 1] || "";
    if (!/\.[A-Za-z0-9]+$/.test(last)) parts[parts.length - 1] = last + ".tsx";
    const joined = parts.join("/");
    if (!/^(Pages|Components|Entities)\/[A-Za-z0-9_\-./]+$/.test(joined)) return "";
    return joined;
  }

  function collectTopBreadcrumbCandidates() {
    const candidates = [];
    const push = (txt) => {
      const t = (txt || "").trim();
      if (!t) return;
      if (t.length > 220) return;
      candidates.push(t.replace(/\s+/g, " "));
    };

    const crumbEls = Array.from(document.querySelectorAll(
      '[aria-label*="Breadcrumb" i], [role="navigation"][aria-label*="breadcrumb" i], [class*="breadcrumb" i], [data-testid*="breadcrumb" i]'
    ));
    for (const el of crumbEls) push(el.innerText || "");

    const all = Array.from(document.querySelectorAll("body *"));
    for (const el of all) {
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r) continue;
      if (r.top < 0 || r.top > 300) continue;
      if (r.height > 120) continue;
      const txt = (el.innerText || "").trim();
      if (!txt) continue;
      if (txt.includes(" / ") || txt.match(/\b(Pages|Components|Entities)\b/i)) push(txt);
    }

    return Array.from(new Set(candidates)).slice(0, 30);
  }

  async function getStableBreadcrumbPath(timeoutMs = 8000, stableMs = 550) {
    const t0 = now();
    let last = "";
    let lastChangeAt = now();

    while (now() - t0 < timeoutMs) {
      const cand = collectTopBreadcrumbCandidates();
      let best = "";
      for (const c of cand) {
        const p = normalizePathFromBreadcrumbText(c);
        if (p) { best = p; break; }
      }

      if (best && best !== last) {
        last = best;
        lastChangeAt = now();
      }
      if (last && (now() - lastChangeAt) >= stableMs) return last;

      await sleep(110);
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

    const sorted = models.slice().sort((a,b) => {
      const al = a.getValueLength ? a.getValueLength() : (a.getValue()?.length||0);
      const bl = b.getValueLength ? b.getValueLength() : (b.getValue()?.length||0);
      return bl - al;
    });
    return sorted[0] || models[0];
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch { return false; }
    }
  }

  function focusMonacoEditorBestEffort() {
    // Try focusing editor area so Ctrl+P is captured by Base44, not browser
    const candidates = [
      document.querySelector('.monaco-editor'),
      document.querySelector('[class*="monaco" i]'),
      document.querySelector('textarea.inputarea'),
      document.querySelector('[role="code"]'),
    ].filter(Boolean);
    if (candidates[0] && candidates[0].focus) {
      try { candidates[0].focus(); } catch {}
      try { candidates[0].click(); } catch {}
    } else {
      try { document.body.click(); } catch {}
    }
  }

  function fireKey(el, type, key, code, ctrl=false, meta=false, shift=false, alt=false) {
    const evt = new KeyboardEvent(type, { key, code, ctrlKey: ctrl, metaKey: meta, shiftKey: shift, altKey: alt, bubbles: true });
    el.dispatchEvent(evt);
  }

  async function openQuickOpenAndType(pathText) {
    focusMonacoEditorBestEffort();
    await sleep(40);

    // Ctrl+P
    fireKey(document, "keydown", "Control", "ControlLeft", true, false);
    fireKey(document, "keydown", "p", "KeyP", true, false);
    fireKey(document, "keyup", "p", "KeyP", true, false);
    fireKey(document, "keyup", "Control", "ControlLeft", false, false);
    await sleep(160);

    // active element should be an input/textarea for quick open
    const ae = document.activeElement;
    if (!ae) return false;

    // Try set value
    try {
      if (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA") {
        ae.value = "";
        ae.dispatchEvent(new Event("input", { bubbles: true }));
        ae.value = pathText;
        ae.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        // sometimes contenteditable
        if (ae.isContentEditable) {
          ae.textContent = pathText;
          ae.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          // fallback: find any input visible
          const inp = Array.from(document.querySelectorAll('input, textarea')).find(x => {
            const r = x.getBoundingClientRect();
            return r.width > 120 && r.height > 18 && r.top >= 0 && r.top < window.innerHeight;
          });
          if (!inp) return false;
          inp.focus();
          inp.value = pathText;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } catch {
      return false;
    }

    await sleep(120);

    // Enter
    fireKey(document, "keydown", "Enter", "Enter", false, false);
    fireKey(document, "keyup", "Enter", "Enter", false, false);
    await sleep(220);
    return true;
  }

  async function tryOpenOneTarget(targetNormalized) {
    const tries = candidatePaths(targetNormalized);
    for (const p of tries) {
      const ok = await openQuickOpenAndType(p);
      if (!ok) continue;

      const crumb = await getStableBreadcrumbPath(6000, 450);
      if (!crumb) continue;

      // Accept only if breadcrumb starts with one of known roots
      if (!/^(Pages|Components|Entities)\//i.test(crumb)) continue;

      return { opened: true, crumb, tried: p };
    }
    return { opened: false, crumb: "", tried: tries[0] || "" };
  }

  console.log("[Base44TargetList] START");
  const monaco = getMonaco();
  if (!monaco) {
    console.log("[Base44TargetList][FAIL] Monaco missing.");
    return;
  }

  const targets = TARGETS_RAW
    .map(normalizeTarget)
    .filter(Boolean);

  console.log("[Base44TargetList] Targets:", targets.length);

  const seen = new Set();
  const blocks = [];
  const failed = [];

  let n = 0;

  for (const t of targets) {
    n++;

    const res = await tryOpenOneTarget(t);
    if (!res.opened) {
      failed.push(t);
      console.log(`[Base44TargetList][SKIP] (${n}/${targets.length}) open failed:`, t);
      continue;
    }

    const breadcrumbPath = res.crumb;
    if (seen.has(breadcrumbPath)) {
      console.log(`[Base44TargetList][DUP] (${n}/${targets.length})`, breadcrumbPath);
      continue;
    }

    const model = pickBestModel(monaco, breadcrumbPath);
    if (!model || !model.getValue) {
      failed.push(t);
      console.log(`[Base44TargetList][SKIP] (${n}/${targets.length}) model missing:`, breadcrumbPath);
      continue;
    }

    const code = model.getValue();
    if (!code || !code.trim()) {
      failed.push(t);
      console.log(`[Base44TargetList][SKIP] (${n}/${targets.length}) code empty:`, breadcrumbPath);
      continue;
    }

    seen.add(breadcrumbPath);
    blocks.push(`FILE: ${breadcrumbPath}\n${code}\n`);
    console.log(`[Base44TargetList][OK] (${n}/${targets.length})`, breadcrumbPath);

    await sleep(90);
  }

  console.log("[Base44TargetList] DONE total exported:", blocks.length);
  console.log("[Base44TargetList] FAILED:", failed.length);
  if (failed.length) console.log("[Base44TargetList] Failed list:", failed);

  const payload = blocks.join("\n");
  if (!payload || !payload.trim()) {
    console.log("[Base44TargetList][FAIL] No payload produced.");
    return;
  }

  if (payload.length <= MAX_CLIPBOARD_CHARS) {
    const okClip = await copyToClipboard(payload);
    console.log("[Base44TargetList] Clipboard:", okClip ? "OK" : "FAILED");
    console.log("[Base44TargetList] Payload chars:", payload.length);
    console.log("[Base44TargetList] NEXT: PowerShell -Action SaveClipboard");
    return;
  }

  console.log("[Base44TargetList] Payload too large -> download parts...");
  let part = 1;
  for (let i = 0; i < payload.length; i += PART_SIZE) {
    const chunk = payload.slice(i, i + PART_SIZE);
    downloadText(`base44_export_part${String(part).padStart(3,"0")}.txt`, chunk);
    console.log("[Base44TargetList] Downloaded part", part, "chars", chunk.length);
    part++;
    await sleep(260);
  }

  console.log("[Base44TargetList] DONE download parts:", part-1);
  console.log("[Base44TargetList] NEXT: PowerShell -Action SaveFromExportFile for each part");
})();