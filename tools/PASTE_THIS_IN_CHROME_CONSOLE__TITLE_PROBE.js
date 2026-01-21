(() => {
  const TIMEOUT_MS = 30000;
  const INTERVAL_MS = 200;
  const STABLE_MS = 600;
  const MIN_LEN = 2;

  const log = (...a) => console.log("[base44-title]", ...a);
  const clean = (s) => (s || "")
    .replace(/\\s+/g, " ")
    .replace(/[\\u200B-\\u200D\\uFEFF]/g, "")
    .trim();

  // โ… EXACT TARGET: <span class="truncate flex-1 text-left">AccountingDashboard</span>
  const pickTitleSpan = () => {
    // 1) strongest match
    const el = document.querySelector("span.truncate.flex-1.text-left");
    if (el) return el;

    // 2) fallback: any span with class 'truncate' AND text-left (sometimes flex-1 missing)
    const all = Array.from(document.querySelectorAll("span.truncate"))
      .filter(s => s.classList.contains("text-left"));

    if (all.length) return all[0];

    // 3) fallback heuristic: span inside top bar that is not "Pages" or "Components"
    const spans = Array.from(document.querySelectorAll("div.px-3.py-1\\.5 span"));
    const good = spans
      .map(s => ({ el: s, t: clean(s.textContent) }))
      .filter(x => x.t && x.t !== "/" && x.t !== "Pages" && x.t !== "Components");

    // prefer last item (usually file/page name)
    if (good.length) return good[good.length - 1].el;

    return null;
  };

  const getTitleText = () => {
    const el = pickTitleSpan();
    if (!el) return "";
    return clean(el.innerText || el.textContent);
  };

  const stableWait = async () => {
    const end = Date.now() + TIMEOUT_MS;
    let last = "";
    let lastChange = Date.now();

    while (Date.now() < end) {
      const v = getTitleText();
      if (v && v !== last) {
        last = v;
        lastChange = Date.now();
        log("change:", v);
      }
      if (last && last.length >= MIN_LEN && (Date.now() - lastChange) >= STABLE_MS) return last;
      await new Promise(r => setTimeout(r, INTERVAL_MS));
    }
    return null;
  };

  const main = async () => {
    log("start wait title span...");
    const result = await stableWait();

    if (!result) {
      log("โ Timeout: title still empty");
      log("debug: count span.truncate.flex-1.text-left =", document.querySelectorAll("span.truncate.flex-1.text-left").length);
      return null;
    }

    log("โ… title:", result);
    return result;
  };

  return main();
})();