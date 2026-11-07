(() => {
  const C = window.VOX || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ust menu: hero ustunde seffaf, kaydirinca dolu */
  const top = $(".top");
  const over = document.body.classList.contains("has-hero");
  const onScroll = () => {
    const y = window.scrollY;
    top.classList.toggle("solid", !over || y > 40);
    top.classList.toggle("over", over && y <= 40);
  };
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  const burger = $(".burger");
  const drawer = $(".drawer");
  const setMenu = (open) => {
    document.body.classList.toggle("menu", open);
    if (burger) { burger.setAttribute("aria-expanded", String(open)); burger.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç"); }
    if (drawer) { drawer.setAttribute("aria-hidden", String(!open)); drawer.inert = !open; }
    if (open && drawer) { const f = $("a", drawer); if (f) f.focus(); } else if (!open && burger && drawer && drawer.contains(document.activeElement)) burger.focus();
  };
  if (drawer) { drawer.id = drawer.id || "menu"; drawer.setAttribute("aria-hidden", "true"); drawer.inert = true; }
  if (burger) {
    burger.setAttribute("aria-expanded", "false"); if (drawer) burger.setAttribute("aria-controls", drawer.id);
    burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu")));
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("menu")) setMenu(false); });
  $$(".drawer a").forEach(a => a.addEventListener("click", () => setMenu(false)));

  /* gorunce belir */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$(".r").forEach(el => io.observe(el));

  /* videolar: sadece gorunurken oynat */
  const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { v.play().catch(() => {}); } else v.pause(); }), { threshold: .15 });
  const small = matchMedia("(max-width:980px)").matches;
  $$("video[data-auto]").forEach(v => {
    if (small && v.closest(".hero .film")) { v.preload = "none"; return; } /* mobilde gizli hero videosunu hic indirme */
    v.muted = true; v.playsInline = true; vio.observe(v);
  });

  /* proje filtresi */
  const fl = $(".filters");
  if (fl) {
    const cards = $$(".card[data-cat]");
    const apply = (cat) => {
      $$("button", fl).forEach(b => b.classList.toggle("on", b.dataset.f === cat));
      cards.forEach(c => c.classList.toggle("hide", !(cat === "hepsi" || c.dataset.cat === cat || c.dataset.st === cat)));
      history.replaceState(null, "", cat === "hepsi" ? location.pathname : "#" + cat);
    };
    $$("button", fl).forEach(b => b.addEventListener("click", () => apply(b.dataset.f)));
    const h = location.hash.slice(1); if (h && $(`button[data-f="${h}"]`, fl)) apply(h);
  }

  /* galeri lightbox */
  const g = $$(".gallery a");
  if (g.length) {
    const lb = document.createElement("div"); lb.className = "lb";
    lb.innerHTML = '<img alt=""><button class="x" aria-label="Kapat">✕</button><button class="p" aria-label="Önceki">‹</button><button class="n" aria-label="Sonraki">›</button><div class="c"></div>';
    document.body.appendChild(lb);
    let i = 0;
    const show = k => { i = (k + g.length) % g.length; $("img", lb).src = g[i].href; $(".c", lb).textContent = `${i + 1} / ${g.length}`; };
    g.forEach((a, k) => a.addEventListener("click", e => { e.preventDefault(); show(k); lb.classList.add("on"); }));
    $(".x", lb).onclick = () => lb.classList.remove("on");
    $(".p", lb).onclick = e => { e.stopPropagation(); show(i - 1); };
    $(".n", lb).onclick = e => { e.stopPropagation(); show(i + 1); };
    lb.addEventListener("click", e => { if (e.target === lb) lb.classList.remove("on"); });
    document.addEventListener("keydown", e => { if (!lb.classList.contains("on")) return; if (e.key === "Escape") lb.classList.remove("on"); if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
    let sx = 0; lb.addEventListener("touchstart", e => sx = e.touches[0].clientX, { passive: true });
    lb.addEventListener("touchend", e => { const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 40) show(i + (d < 0 ? 1 : -1)); });
  }

  /* renk paleti: kapak gorselinden */
  const pal = $(".sw[data-src]");
  if (pal) {
    const img = new Image(); img.src = pal.dataset.src;
    img.onload = () => {
      const c = document.createElement("canvas"), W = 120, H = Math.round(120 * img.height / img.width);
      c.width = W; c.height = H; const x = c.getContext("2d"); x.drawImage(img, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data, px = [];
      for (let k = 0; k < d.length; k += 16) px.push([d[k], d[k + 1], d[k + 2]]);
      let cs = [0, .2, .45, .7, .95].map(q => { const s = px.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2])); return s[Math.floor(q * (s.length - 1))].slice(); });
      for (let it = 0; it < 10; it++) {
        const acc = cs.map(() => [0, 0, 0, 0]);
        px.forEach(p => { let bi = 0, bd = 1e9; cs.forEach((q, j) => { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (dd < bd) { bd = dd; bi = j; } }); const a = acc[bi]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; });
        cs = cs.map((q, j) => acc[j][3] ? [acc[j][0] / acc[j][3], acc[j][1] / acc[j][3], acc[j][2] / acc[j][3]] : q);
      }
      cs.sort((a, b) => (b[0] + b[1] + b[2]) - (a[0] + a[1] + a[2]));
      const hex = q => "#" + q.map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
      pal.innerHTML = cs.map(q => { const l = (q[0] * .3 + q[1] * .59 + q[2] * .11); return `<div style="background:${hex(q)};color:${l > 140 ? "#372621" : "#F1E9DC"}">${hex(q)}</div>`; }).join("");
    };
  }

  /* lead:start — teklif formu yardımcıları (saf; tools/test_talepler.mjs test eder) */
  const UTM_KEYS = ["source", "medium", "campaign", "term", "content"];
  const leadPayload = (v, ctx) => {
    const sp = new URLSearchParams(ctx.search || ""), utm = {};
    UTM_KEYS.forEach(k => { const x = sp.get("utm_" + k); if (x) utm[k] = x.slice(0, 80); });
    let ref = ""; try { const r = new URL(ctx.referrer || ""); if (r.host && r.host !== ctx.host) ref = r.host; } catch (e) {}
    const proje = new URLSearchParams(ctx.pageSearch || "").get("proje");
    return { ad: v.ad, tel: v.tel, eposta: v.eposta, tip: v.tip, kapsam: v.kapsam, alan: v.alan, konum: v.konum, zaman: v.zaman, not: v.not,
      web: v.web || "", ts: ctx.ts, sent: ctx.now, page: (ctx.path || "/") + (proje ? "?proje=" + encodeURIComponent(proje).slice(0, 80) : ""), utm, ref };
  };
  const waText = v => [`Merhaba, web sitesinden teklif talebi:`, ``, `Mülk tipi: ${v.tip}`, `Kapsam: ${v.kapsam}`, `Alan: ${v.alan || "-"} m²`,
    `Konum / site: ${v.konum || "-"}`, `Zaman: ${v.zaman}`, ``, `Ad: ${v.ad}`, `Telefon: ${v.tel || "-"}`, `E-posta: ${v.eposta || "-"}`, `Not: ${v.not || "-"}`].join("\n");
  /* lead:end */

  /* kampanya kaynağı (utm) ve yönlendiren site: oturum boyunca hatırla, formla birlikte gönderilir */
  try {
    if (/[?&]utm_/.test(location.search)) sessionStorage.setItem("vox-utm", location.search);
    if (!sessionStorage.getItem("vox-ref")) sessionStorage.setItem("vox-ref", document.referrer || "-");
  } catch (e) {}

  /* teklif formu */
  const f = $("#teklif");
  if (f) {
    const t0 = Date.now();
    const steps = $$(".step", f), bars = $$(".prog i", f), back = $(".back", f), next = $(".next", f), err = $(".err", f);
    let s = 0;
    const q = new URLSearchParams(location.search);
    if (q.get("proje")) $("[name=not]", f).value = `${q.get("proje")} projesi hakkında${q.get("konu") === "renk" ? " renk ve malzeme kodlarını" : ""} bilgi almak istiyorum.`;
    const go = k => {
      s = k; steps.forEach((el, j) => el.classList.toggle("on", j === s)); bars.forEach((b, j) => b.classList.toggle("on", j <= s));
      back.hidden = s === 0; next.textContent = s === steps.length - 1 ? "Gönder" : "Devam"; err.textContent = "";
    };
    const valid = () => {
      const st = steps[s];
      if ($$("input[type=radio],input[type=checkbox]", st).length && !$$("input:checked", st).length) return "Lütfen bir seçenek işaretleyin.";
      if (s === steps.length - 1) {
        if (!$("[name=ad]", f).value.trim()) return "Adınızı yazar mısınız?";
        if (C.talep_url && $("[name=tel]", f).value.replace(/\D/g, "").length < 7) return "Size dönebilmemiz için telefon numaranızı yazar mısınız?";
        if (!$("[name=tel]", f).value.trim() && !$("[name=eposta]", f).value.trim()) return "Size ulaşabilmemiz için telefon ya da e-posta gerekli.";
      }
      return "";
    };
    next.addEventListener("click", () => {
      const e = valid(); if (e) { err.textContent = e; return; }
      if (s < steps.length - 1) return go(s + 1);
      const v = n => $$(`[name=${n}]`, f).filter(i => i.type !== "radio" && i.type !== "checkbox" || i.checked).map(i => i.value).filter(Boolean).join(", ");
      const vals = {}; ["tip", "kapsam", "alan", "konum", "zaman", "ad", "tel", "eposta", "not", "web"].forEach(n => vals[n] = v(n));
      const msg = waText(vals);
      const waUrl = C.whatsapp ? `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(msg)}` : "";
      const openDirect = () => {
        if (waUrl) window.open(waUrl, "_blank");
        else location.href = `mailto:${C.email}?subject=${encodeURIComponent("Teklif talebi - " + vals.ad)}&body=${encodeURIComponent(msg)}`;
      };
      if (!C.talep_url) { openDirect(); $(".qbody", f).hidden = true; $(".done", f).hidden = false; return; }
      /* talep sunucuya (Google Tablo + bildirim) gider; olmazsa WhatsApp'a düşer */
      const fallback = (why) => {
        const fb = $(".done-fb", f); if (fb) { const t = $(".fb-t", fb); if (t && why) t.textContent = why; const a = $("a.fb-wa", fb); if (a && waUrl) a.href = waUrl; }
        $(".qbody", f).hidden = true; (fb || $(".done", f)).hidden = false;
        openDirect();
      };
      let sp = location.search, ref = "";
      try { if (!/[?&]utm_/.test(sp)) sp = sessionStorage.getItem("vox-utm") || ""; ref = sessionStorage.getItem("vox-ref") || document.referrer; } catch (e) {}
      const body = leadPayload(vals, { ts: t0, now: Date.now(), path: location.pathname, pageSearch: location.search, search: sp, referrer: ref === "-" ? "" : ref, host: location.host });
      next.disabled = true; next.textContent = "Gönderiliyor…";
      const ctl = window.AbortController ? new AbortController() : null;
      const tm = setTimeout(() => ctl && ctl.abort(), 15000);
      fetch(C.talep_url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body), redirect: "follow", signal: ctl ? ctl.signal : undefined })
        .then(r => r.json())
        .then(j => {
          if (j && j.ok) {
            const ok = $(".done-ok", f), a = $("a.ok-wa", f);
            if (a) { if (waUrl) a.href = waUrl; else a.hidden = true; }
            $(".qbody", f).hidden = true; ok.hidden = false; return;
          }
          const e = j && j.error;
          if (e === "ad" || e === "tel") { err.textContent = e === "ad" ? "Adınızı yazar mısınız?" : "Size dönebilmemiz için telefon numaranızı yazar mısınız?"; return; }
          fallback(e === "rate" ? "Kısa sürede birden fazla talep gönderildi. Talebinizi WhatsApp'tan iletebilirsiniz." : "");
        })
        .catch(() => fallback(""))
        .finally(() => { clearTimeout(tm); next.disabled = false; next.textContent = "Gönder"; });
    });
    back.addEventListener("click", () => go(Math.max(0, s - 1)));
    go(0);
  }
  /* 360 tasarim turu (Pannellum, tiklayinca yuklenir) */
  const pano = $(".pano");
  if (pano) {
    const base = pano.dataset.base, pv = $(".pv", pano), box = $(".pvi", pano), lab = $(".pl", pano), rooms = $$(".rooms button", pano);
    let viewer = null, cur = rooms[0] && rooms[0].dataset.k, loading = null;
    const lib = () => loading || (loading = new Promise((ok, no) => {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/assets/pannellum/pannellum.css"; document.head.appendChild(l);
      const s = document.createElement("script"); s.src = "/assets/pannellum/pannellum.js"; s.onload = ok; s.onerror = no; document.head.appendChild(s);
    }));
    const scene = k => ({ type: "equirectangular", panorama: base + k + ".jpg", preview: base + k + "-p.jpg", hfov: 100, minHfov: 50, maxHfov: 120, autoLoad: true });
    const mark = k => { rooms.forEach(b => { const on = b.dataset.k === k; b.classList.toggle("on", on); on ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"); if (on) lab.textContent = b.dataset.l; }); };
    const start = async k => {
      cur = k || cur; mark(cur);
      try { await lib(); } catch (e) { lab.textContent = "360° görüntüleyici yüklenemedi"; return; }
      pano.classList.add("live");
      if (!viewer) {
        const sc = {}; rooms.forEach(b => sc[b.dataset.k] = scene(b.dataset.k));
        viewer = pannellum.viewer(box, { default: { firstScene: cur, sceneFadeDuration: 600, autoLoad: true, mouseZoom: false, showFullscreenCtrl: false, showZoomCtrl: !matchMedia("(pointer:coarse)").matches, compass: false, strings: { loadingLabel: "Yükleniyor…", bylineLabel: "", genericWebGLError: "Tarayıcınız 360° görüntülemeyi desteklemiyor.", iOS8WebGLError: "Cihazınız 360° görüntülemeyi desteklemiyor.", loadButtonLabel: "Yükle" } }, scenes: sc });
      } else if (viewer.getScene() !== cur) viewer.loadScene(cur);
    };
    $(".pgo", pano).addEventListener("click", () => start());
    rooms.forEach(b => b.addEventListener("click", () => {
      if (!viewer) { $(".pc", pano).src = base + b.dataset.k + "-p.jpg"; }
      start(b.dataset.k);
    }));
    const fs = on => { pano.classList.toggle("fs", on); document.body.classList.toggle("pano-fs", on); $(".pfs", pano).textContent = on ? "Kapat" : "Tam ekran"; if (viewer) setTimeout(() => viewer.resize(), 60); };
    $(".pfs", pano).addEventListener("click", () => { const on = !pano.classList.contains("fs"); fs(on); if (on && !viewer) start(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && pano.classList.contains("fs")) fs(false); });
  }
  /* tasarim / uygulama kaydirici */
  const rv = $(".rv");
  if (rv) {
    const t = $(".rvt", rv), n = $$(".rvs", rv).length, c = $(".c", rv);
    const idx = () => Math.round(t.scrollLeft / t.clientWidth);
    const go = k => { k = Math.max(0, Math.min(n - 1, k)); c.textContent = `${k + 1} / ${n}`; t.scrollTo({ left: k * t.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
    $(".p", rv).addEventListener("click", () => go(idx() - 1));
    $(".n", rv).addEventListener("click", () => go(idx() + 1));
    t.addEventListener("scroll", () => { c.textContent = `${idx() + 1} / ${n}`; }, { passive: true });
    t.addEventListener("keydown", e => { if (e.key === "ArrowRight") { e.preventDefault(); go(idx() + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(idx() - 1); } });
  }

  /* hit:start — ziyaret sayımı (çerez yok, IP yok; saf yardımcılar tools/test_talepler.mjs'te test edilir) */
  const visitSource = (search, referrer, host) => {
    let u = ""; try { u = (new URLSearchParams(search || "").get("utm_source") || "").toLowerCase().trim(); } catch (e) {}
    if (u) return /instagram|^ig$/.test(u) ? "instagram" : /facebook|^fb$/.test(u) ? "facebook" : /whatsapp|^wa$/.test(u) ? "whatsapp" : "kampanya";
    let rh = ""; try { rh = referrer ? new URL(referrer).hostname.toLowerCase() : ""; } catch (e) {}
    if (!rh || rh === String(host || "").toLowerCase()) return "direkt";
    if (rh.indexOf("instagram") >= 0) return "instagram";
    if (/(^|\.)google\./.test(rh)) return "google";
    if (rh.indexOf("whatsapp") >= 0 || rh === "wa.me") return "whatsapp";
    if (rh.indexOf("facebook") >= 0 || /(^|\.)fb\.(com|me)$/.test(rh)) return "facebook";
    return "diger-site";
  };
  const refHost = (referrer, host) => { try { const h = new URL(referrer).hostname.toLowerCase(); return h === String(host || "").toLowerCase() ? "" : h.slice(0, 100); } catch (e) { return ""; } };
  const hitBody = (o) => ({ action: "hit", p: String(o.path || "/").slice(0, 200), r: refHost(o.referrer, o.host), s: o.source || visitSource(o.search, o.referrer, o.host), d: o.mobile ? "m" : "d", n: o.firstToday ? 1 : 0 });
  /* hit:end */
  try {
    if (C.talep_url && !/^\/panel(\/|$)/.test(location.pathname) && !navigator.webdriver && !localStorage.getItem("vox_ben")) {
      const d = new Date(), today = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
      const first = localStorage.getItem("vox_gun") !== today;
      if (first) localStorage.setItem("vox_gun", today);
      let src = ""; try { src = sessionStorage.getItem("vox-src") || ""; } catch (e) {}
      if (!src) { src = visitSource(location.search, document.referrer, location.host); try { sessionStorage.setItem("vox-src", src); } catch (e) {} }
      const body = hitBody({ path: location.pathname, referrer: document.referrer, host: location.host, source: src,
        mobile: matchMedia("(max-width: 760px)").matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent), firstToday: first });
      const txt = JSON.stringify(body);
      if (!(navigator.sendBeacon && navigator.sendBeacon(C.talep_url, new Blob([txt], { type: "text/plain" }))))
        fetch(C.talep_url, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain" }, body: txt }).catch(() => {});
    }
  } catch (e) {}
})();
