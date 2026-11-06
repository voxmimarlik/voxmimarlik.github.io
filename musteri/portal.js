// VOX müşteri portalı — arayüz (çerçevesiz, derleme yok). Veri: Apps Script p_* işlemleri. Saf yardımcılar: portal-core.js
import * as C from "./portal-core.js";

const CFG = window.VOX_PORTAL || {};
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const API = (LOCAL && new URLSearchParams(location.search).get("api")) || CFG.api || "";
const STORE = "vox-portal";
const S = { api: null, sess: null, data: null, thumbs: new Map(), qThumb: new Set(), qTimer: null, full: new Map(), preview: false, busy: false };

// ---------------------------------------------------------------- DOM yardımcıları
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const $ = (s, r = document) => r.querySelector(s);
const svg = (d, cls = "ic") => { const s = document.createElement("span"); s.className = cls; s.setAttribute("aria-hidden", "true"); s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; return s; };
const IC = {
  wa: '<path d="M20.5 11.6a8.6 8.6 0 0 1-12.6 7.6L3 20.7l1.5-4.8a8.6 8.6 0 1 1 16-4.3Z"/><path d="m8.2 7.7 1.4-.4 1.3 2.6-1.1 1a8.4 8.4 0 0 0 3.2 3.2l1-1.1 2.6 1.3-.4 1.4c-.2.7-.9 1-1.6.9-4.5-.8-7.2-3.5-8-8-.1-.7.2-1.4.9-1.6Z"/>',
  phone: '<path d="M5.5 4h3l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7l1.3-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 4 5.6 1.5 1.5 0 0 1 5.5 4z"/>',
  back: '<path d="M15 5 8 12l7 7"/>', next: '<path d="m9 5 7 7-7 7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  dl: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>', file: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/>', copy: '<rect x="8.5" y="8.5" width="11" height="11"/><path d="M15.5 8.5v-4h-11v11h4"/>',
  up: '<path d="M12 19V8M7 12.5l5-5 5 5M5 4.5h14"/>', expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', out: '<path d="M14 4H5v16h9M10 12h10M17 9l3 3-3 3"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', lock: '<rect x="5" y="10.5" width="14" height="10"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>', star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>', eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
};
const KIND_IC = { pdf: "file", dwg: "file", tablo: "file", arsiv: "file", dosya: "file", html: "play", gorsel: "eye" };

// ---------------------------------------------------------------- oturum
function loadSess() { try { const s = JSON.parse(localStorage.getItem(STORE) || "null"); if (s && s.token && s.exp > Date.now()) return s; } catch {} return null; }
function saveSess(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {} }
function clearSess() { try { localStorage.removeItem(STORE); sessionStorage.removeItem(STORE + "-onizleme"); } catch {} }

// ---------------------------------------------------------------- başlangıç
async function boot() {
  // panel önizlemesi: #onizleme=<belirteç> (yalnız bu sekmede)
  const pm = /^#onizleme=([^&]+)/.exec(location.hash);
  if (pm) { sessionStorage.setItem(STORE + "-onizleme", decodeURIComponent(pm[1])); history.replaceState(null, "", location.pathname + location.search + "#/genel"); }
  const pv = sessionStorage.getItem(STORE + "-onizleme");
  if (!API) return notReady();
  S.api = new C.PortalAPI({ url: API });
  if (pv) { S.preview = true; S.sess = { token: pv, code: "", preview: true }; S.api.token = pv; return openProject(); }
  const sess = loadSess();
  const codeHash = /^#([A-Za-z0-9-]{4,24})$/.exec(location.hash);
  if (sess && (!codeHash || codeHash[1].toUpperCase() === sess.code)) { S.sess = sess; S.api.token = sess.token; if (codeHash) history.replaceState(null, "", "#/genel"); return openProject(); }
  let ready = true;
  try { ready = await S.api.ready(); } catch { /* ağ hatası: giriş ekranında gösterilir */ }
  if (!ready) return notReady();
  showLogin(codeHash ? codeHash[1].toUpperCase() : "");
}

function shell(...kids) { const app = $("#app"); app.className = ""; app.replaceChildren(...kids.filter(Boolean)); }
function notReady() {
  document.title = "Proje portalı hazırlanıyor · VOX Mimarlık";
  shell(h("main", { class: "login" }, h("div", { class: "login-card" },
    h("img", { class: "login-logo", src: "/assets/logo/logo-full.svg", alt: "VOX Mimarlık", width: 120, height: 120 }),
    h("div", { class: "eyebrow login-eb" }, "Proje portalı"),
    h("h1", { class: "login-t" }, "Portalımız hazırlanıyor"),
    h("p", { class: "login-s" }, "Proje sayfanız çok yakında burada olacak. Bu arada her şey için bize WhatsApp'tan veya telefonla ulaşabilirsiniz."),
    contactButtons("login-contact")),
  h("p", { class: "login-foot" }, "VOX Mimarlık · voxmimarlik.com")));
}

function showLogin(code, msgText) {
  document.title = "Giriş · VOX Proje portalı";
  const msg = h("p", { class: "login-msg", role: "alert", "aria-live": "assertive" }, msgText || "");
  const codeIn = h("input", { id: "kod", name: "username", autocomplete: "username", autocapitalize: "characters", spellcheck: "false", value: code || "", placeholder: "ÖRN. BULVAR-E438", required: true });
  const pw = h("input", { id: "sifre", type: "password", name: "password", autocomplete: "current-password", required: true });
  const show = h("button", { type: "button", class: "pw-toggle", "aria-label": "Şifreyi göster", onclick: () => { const on = pw.type === "password"; pw.type = on ? "text" : "password"; show.textContent = on ? "Gizle" : "Göster"; } }, "Göster");
  const btn = h("button", { class: "btn btn-d btn-block", type: "submit" }, "Giriş yap");
  const form = h("form", { class: "login-form", novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); msg.textContent = "";
    if (!codeIn.value.trim() || !pw.value) { msg.textContent = "Proje kodunuzu ve şifrenizi yazın."; return (codeIn.value.trim() ? pw : codeIn).focus(); }
    btn.disabled = true; btn.textContent = "Giriş yapılıyor…";
    try {
      const r = await S.api.call("p_login", { code: codeIn.value.trim(), password: pw.value });
      S.sess = { token: r.token, exp: r.exp, code: codeIn.value.trim().toUpperCase(), ad: r.ad };
      saveSess(S.sess); S.api.token = r.token; pw.value = "";
      history.replaceState(null, "", "#/genel");
      openProject();
    } catch (err) {
      if (err.code === "action" || err.code === "auth") return notReady();
      msg.textContent = err.message; pw.select();
    } finally { btn.disabled = false; btn.textContent = "Giriş yap"; }
  } },
    h("div", { class: "f" }, h("label", { for: "kod" }, "Proje kodu"), codeIn),
    h("div", { class: "f" }, h("label", { for: "sifre" }, "Şifre"), h("div", { class: "pw" }, pw, show)),
    btn, msg);
  shell(h("main", { class: "login" }, h("div", { class: "login-card" },
    h("img", { class: "login-logo", src: "/assets/logo/logo-full.svg", alt: "VOX Mimarlık", width: 120, height: 120 }),
    h("div", { class: "eyebrow login-eb" }, "Proje portalı"),
    h("h1", { class: "sr-only" }, "VOX Mimarlık proje portalı girişi"),
    h("p", { class: "login-s" }, "Projenizin tüm aşamaları, dosyaları ve onaylarınız tek sayfada."),
    form,
    h("p", { class: "login-help" }, "Kodunuz ve şifreniz size WhatsApp'tan gönderildi. Bulamazsanız ", h("a", { href: `https://wa.me/${C.WHATSAPP}?text=${encodeURIComponent("Merhaba, proje portalı şifremi bulamadım.")}`, target: "_blank", rel: "noopener" }, "bize yazın"), ".")),
  h("p", { class: "login-foot" }, "VOX Mimarlık · voxmimarlik.com")));
  setTimeout(() => (code ? pw : codeIn).focus(), 60);
}

function logout(msg) { clearSess(); S.sess = S.data = null; S.thumbs.clear(); S.full.clear(); history.replaceState(null, "", location.pathname + location.search); S.preview = false; showLogin("", msg); }

async function openProject() {
  shell(h("div", { class: "boot" }, h("img", { src: "/assets/logo/logo-mark.svg", alt: "", width: 44, height: 44 }), h("span", { class: "eyebrow" }, "Projeniz yükleniyor…")));
  try { await reload(); }
  catch (e) {
    if (e.code === "oturum") return S.preview ? (sessionStorage.removeItem(STORE + "-onizleme"), notReadyPreview()) : logout("Oturumunuzun süresi doldu. Lütfen yeniden giriş yapın.");
    if (e.code === "action" || e.code === "auth") return notReady();
    shell(h("main", { class: "login" }, h("div", { class: "login-card" }, h("p", { class: "eyebrow" }, "Bağlantı sorunu"), h("p", { class: "login-s" }, e.message), h("button", { class: "btn btn-d", onclick: () => openProject() }, "Tekrar dene"))));
    return;
  }
  frame(); route();
}
function notReadyPreview() { shell(h("main", { class: "login" }, h("div", { class: "login-card" }, h("p", { class: "eyebrow" }, "Önizleme"), h("p", { class: "login-s" }, "Önizleme süresi doldu. Panelden yeniden açın.")))); }
async function reload() {
  const j = await S.api.call("p_project");
  S.data = j; S.preview = !!j.onizleme || S.preview;
  return j;
}
// sekmeye dönünce (1 dk'dan eskiyse) veriyi tazele
let lastLoad = Date.now();
document.addEventListener("visibilitychange", async () => {
  if (document.hidden || !S.data || Date.now() - lastLoad < 60000 || document.querySelector(".modal-bg,.lb,.pres-fs")) return;
  try { await reload(); lastLoad = Date.now(); rerender(); } catch {}
});
function apply(j) { if (j && j.proje) { S.data.proje = j.proje; S.data.m = j.m; S.data.d = j.d; } }

// ---------------------------------------------------------------- iskelet
const P = () => S.data.proje, D = () => S.data.d, M = () => S.data.m;
const hasT = () => String(P().tip).includes("tasarim"), hasU = () => String(P().tip).includes("uygulama");
function sections() {
  const s = [["genel", "Genel bakış"]];
  s.push(["baslangic", "Başlangıç"]);
  if (hasT()) s.push(["tasarim", "Tasarım"]);
  if (hasT() && hasU()) s.push(["gecis", "Uygulamaya geçiş"]);
  if (hasU()) s.push(["takvim", "İş takvimi"], ["raporlar", "Haftalık rapor"], ["secimler", "Malzeme seçimi"], ["ekisler", "Ek işler"]);
  s.push(["odemeler", "Ödemeler"], ["teslim", "Teslim"]);
  return s;
}
function frame() {
  const p = P();
  document.title = `${p.ad} · VOX Proje portalı`;
  const nav = h("nav", { class: "tabs", "aria-label": "Bölümler" }, h("div", { class: "tabs-in" }, sections().map(([k, t]) => {
    const n = D().bekleyen.filter((b) => navOf(b.yer) === k).length;
    return h("a", { href: `#/${k}`, "data-k": k }, t, n ? h("b", { class: "dot", "aria-label": `${n} bekleyen` }, String(n)) : null);
  })));
  const app = $("#app"); app.className = "app";
  app.replaceChildren(...[
    S.preview ? h("div", { class: "pvbar" }, svg(IC.eye), "Önizleme — müşterinin gördüğü sayfa (salt okunur)") : null,
    h("header", { class: "top" },
      h("a", { class: "brand", href: "#/genel", "aria-label": "Genel bakış" }, h("img", { src: "/assets/logo/logo-mark.svg", alt: "", width: 30, height: 30 }), h("span", { class: "brand-t" }, h("span", { class: "eyebrow" }, "Proje portalı"), h("span", { class: "brand-p" }, p.ad))),
      h("div", { class: "top-r" },
        h("a", { class: "toplink hide-m", href: `https://wa.me/${C.WHATSAPP}`, target: "_blank", rel: "noopener" }, svg(IC.wa), "WhatsApp"),
        S.preview ? null : h("button", { class: "toplink", type: "button", onclick: async () => { if (await confirmBox("Çıkış yapılsın mı? Tekrar girmek için proje kodu ve şifreniz gerekir.", "Çıkış yap")) logout("Çıkış yaptınız."); } }, svg(IC.out), h("span", { class: "hide-m" }, "Çıkış")))),
    nav,
    h("main", { id: "view", class: "view", tabindex: "-1" }),
    footer(),
    h("div", { class: "cbar" }, contactButtons("cbar-in")),
    h("div", { id: "toasts", class: "toasts", role: "status", "aria-live": "polite" })].filter(Boolean));
}
function navOf(yer) { return { tasarim: "tasarim", gecis: "gecis", secimler: "secimler", ekisler: "ekisler", odemeler: "odemeler", teslim: "teslim", takvim: "takvim" }[yer] || "genel"; }
function footer() {
  return h("footer", { class: "foot" },
    h("img", { src: "/assets/logo/logo-full.svg", alt: "VOX Mimarlık", width: 84, height: 84, class: "foot-logo" }),
    h("div", { class: "foot-c" }, h("div", { class: "eyebrow" }, "Telefon"), C.PHONES.map(([t, n]) => h("a", { href: `tel:${n}` }, t))),
    h("div", { class: "foot-c" }, h("div", { class: "eyebrow" }, "Bize yazın"), h("a", { href: `https://wa.me/${C.WHATSAPP}`, target: "_blank", rel: "noopener" }, "WhatsApp"), h("a", { href: "https://www.instagram.com/vox.mimarlik/", target: "_blank", rel: "noopener" }, "@vox.mimarlik"), h("a", { href: "https://voxmimarlik.github.io", target: "_blank", rel: "noopener" }, "voxmimarlik.com")),
    h("p", { class: "foot-s" }, "Bu sayfa yalnız size özeldir. Proje kodunuzu ve şifrenizi kimseyle paylaşmayın."));
}
function contactButtons(cls) {
  const wa = `https://wa.me/${C.WHATSAPP}?text=${encodeURIComponent(S.data ? `Merhaba, ${P().ad} projesi hakkında yazıyorum.` : "Merhaba")}`;
  return h("div", { class: cls },
    h("a", { class: "cb cb-wa", href: wa, target: "_blank", rel: "noopener" }, svg(IC.wa), h("span", {}, "WhatsApp")),
    h("button", { class: "cb", type: "button", onclick: callSheet }, svg(IC.phone), h("span", {}, "Ara")));
}
function callSheet() {
  modal((card, close) => card.append(h("div", { class: "eyebrow" }, "Bizi arayın"), h("p", { class: "modal-t" }, "Hangi numarayı arayalım?"),
    h("div", { class: "callist" }, C.PHONES.map(([t, n]) => h("a", { class: "btn btn-o btn-block", href: `tel:${n}` }, svg(IC.phone), t))),
    h("div", { class: "modal-b" }, h("button", { class: "btn btn-t", type: "button", onclick: () => close() }, "Kapat"))));
}

window.addEventListener("hashchange", () => { if (S.data) route(); else if (/^#[A-Za-z0-9-]{4,24}$/.test(location.hash) && $(".login-form")) $("#kod").value = location.hash.slice(1).toUpperCase(); });
function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const secs = sections().map(([k]) => k);
  const k = parts[0] === "kayit" ? "kayit" : secs.includes(parts[0]) ? parts[0] : "genel";
  document.querySelectorAll(".tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.k === k ? "page" : "false"));
  const cur = $(`.tabs a[data-k="${k}"]`); if (cur) cur.scrollIntoView({ block: "nearest", inline: "center" });
  const view = h("main", { id: "view", class: "view", tabindex: "-1" });
  $("#view").replaceWith(view); window.scrollTo(0, 0);
  const go = { genel: overview, baslangic: startPage, tasarim: () => (parts[1] ? stagePage(parts[1]) : designPage()), gecis: transitionPage, takvim: schedulePage, raporlar: reportsPage,
    secimler: selectionsPage, ekisler: changesPage, odemeler: paymentsPage, teslim: handoverPage, kayit: logPage }[k];
  view.append(...[].concat(go()).filter(Boolean));
  flushThumbs();
}
const rerender = () => { const y = window.scrollY; frame(); route(); window.scrollTo(0, y); };

// ---------------------------------------------------------------- görseller (küçük görsel toplu, büyük görsel tek tek)
function thumb(f, { alt = "", cls = "" } = {}) {
  const im = h("img", { alt: alt || f.aciklama || f.ad || "", class: cls, decoding: "async" });
  const wrap = h("span", { class: "ph is-loading" }, im);
  const id = f.tid || f.fid;
  if (f.w && f.h) wrap.style.aspectRatio = `${f.w} / ${f.h}`;
  im.addEventListener("load", () => wrap.classList.remove("is-loading"));
  const got = S.thumbs.get(id);
  if (got) im.src = got; else { im.dataset.tid = id; S.qThumb.add(id); clearTimeout(S.qTimer); S.qTimer = setTimeout(flushThumbs, 20); }
  return wrap;
}
async function flushThumbs() {
  const ids = [...S.qThumb].filter((x) => !S.thumbs.has(x)); S.qThumb.clear();
  for (let i = 0; i < ids.length; i += 12) {
    const batch = ids.slice(i, i + 12);
    S.api.call("p_thumbs", { ids: batch }).then((j) => {
      for (const [id, url] of Object.entries(j.data || {})) { S.thumbs.set(id, url); document.querySelectorAll(`img[data-tid="${CSS.escape(id)}"]`).forEach((im) => { im.src = url; im.removeAttribute("data-tid"); }); }
      for (const id of batch) if (!(j.data || {})[id]) document.querySelectorAll(`img[data-tid="${CSS.escape(id)}"]`).forEach((im) => { im.parentElement.classList.remove("is-loading"); im.parentElement.classList.add("is-empty"); });
    }).catch(() => {});
  }
}
async function fileData(fid) {
  if (S.full.has(fid)) return S.full.get(fid);
  const p = S.api.call("p_file", { fid }).then((j) => {
    if (j.url) return { url: j.url, name: j.name, mime: j.mime, remote: true };
    const bin = atob(j.b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const blob = new Blob([u8], { type: j.mime || "application/octet-stream" });
    return { url: URL.createObjectURL(blob), name: j.name, mime: j.mime, blob };
  });
  S.full.set(fid, p); p.catch(() => S.full.delete(fid));
  return p;
}
async function download(f, btn) {
  const old = btn && btn.innerHTML;
  if (btn) { btn.disabled = true; btn.classList.add("busy"); }
  try {
    const d = await fileData(f.fid);
    if (d.remote) { window.open(d.url, "_blank", "noopener"); return; }
    const a = h("a", { href: d.url, download: f.ad || d.name || "dosya" }); document.body.append(a); a.click(); a.remove();
  } catch (e) { toast(e.message || "Dosya alınamadı.", "err"); }
  finally { if (btn) { btn.disabled = false; btn.classList.remove("busy"); btn.innerHTML = old; } }
}

// ---------------------------------------------------------------- ortak bileşenler
const chip = (t, k = "") => h("span", { class: `chip ${k}` }, t);
function statusChip(st) { return chip(C.ASAMA_DURUM[st] || st, "st-" + st); }
function head(eyebrow, title, sub) { return h("div", { class: "phead" }, h("div", { class: "eyebrow" }, eyebrow), h("h1", { class: "phead-t" }, title), sub ? h("p", { class: "phead-s" }, sub) : null); }
function sec(title, ...kids) { return h("section", { class: "sec" }, title ? h("h2", { class: "sec-h eyebrow" }, title) : null, kids); }
const ornek = (o) => (o && o.ornek ? chip("Örnek", "st-ornek") : null);
function gallery(files, { cols = "", caption = true } = {}) {
  const imgs = files.filter((f) => C.fileKind(f) === "gorsel");
  if (!imgs.length) return null;
  return h("div", { class: `gal ${cols}` }, imgs.map((f, i) => h("button", { type: "button", class: "gal-i", "aria-label": `${f.aciklama || f.ad} — büyüt`, onclick: () => lightbox(imgs, i) },
    thumb(f), caption && f.aciklama ? h("span", { class: "gal-c" }, f.aciklama) : null)));
}
function fileRows(files, { title } = {}) {
  const rows = files.filter((f) => C.fileKind(f) !== "gorsel" && C.fileKind(f) !== "html");
  if (!rows.length) return null;
  return h("div", { class: "files" }, title ? h("div", { class: "files-h eyebrow" }, title) : null, rows.map((f) => {
    const k = C.fileKind(f);
    const b = h("button", { type: "button", class: "frow", onclick: () => download(f, b) },
      h("span", { class: `fic fk-${k}` }, k === "dwg" ? "DWG" : k === "pdf" ? "PDF" : "DOSYA"),
      h("span", { class: "fmeta" }, h("span", { class: "fname" }, f.ad), h("small", {}, [C.KIND_AD[k], C.fileSize(f.boyut), f.surum].filter(Boolean).join(" · "))),
      h("span", { class: "fdl" }, svg(IC.dl), h("span", { class: "hide-m" }, "İndir")));
    return b;
  }));
}
function presentations(list) {
  if (!list || !list.length) return null;
  return h("div", { class: "pres" }, list.map((f) => h("button", { type: "button", class: "pres-i", onclick: (e) => openPresentation(f, e.currentTarget) },
    h("span", { class: "pres-ic" }, svg(IC.expand)),
    h("span", {}, h("span", { class: "eyebrow" }, "Etkileşimli sunum"), h("strong", {}, f.ad), f.aciklama ? h("small", {}, f.aciklama) : null),
    h("span", { class: "pres-go" }, "Tam ekran aç", svg(IC.next)))));
}
async function openPresentation(f, btn) {
  btn.classList.add("busy");
  try {
    const d = await fileData(f.fid);
    const html = d.blob ? await d.blob.text() : null;
    const close = () => { wrap.remove(); document.body.classList.remove("modal-open"); };
    const fr = h("iframe", { class: "pres-fr", title: f.ad, sandbox: "allow-scripts allow-popups allow-popups-to-escape-sandbox", referrerpolicy: "no-referrer" });
    if (html != null) fr.srcdoc = html; else fr.src = d.url;
    const wrap = h("div", { class: "pres-fs", role: "dialog", "aria-modal": "true", "aria-label": f.ad },
      h("div", { class: "pres-bar" }, h("span", {}, f.ad), h("button", { type: "button", class: "lb-x", "aria-label": "Kapat", onclick: close }, svg(IC.x))), fr);
    wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    document.body.append(wrap); document.body.classList.add("modal-open"); $(".lb-x", wrap).focus();
  } catch (e) { toast(e.message || "Sunum açılamadı.", "err"); }
  finally { btn.classList.remove("busy"); }
}

// ---------------------------------------------------------------- büyük görsel (lightbox)
function lightbox(list, start) {
  let i = start;
  const img = h("img", { class: "lb-img", alt: "" });
  const low = h("img", { class: "lb-low", alt: "" });
  const cap = h("div", { class: "lb-cap" });
  const cnt = h("span", { class: "lb-n" });
  const dl = h("button", { type: "button", class: "lb-btn", onclick: () => download(list[i], dl) }, svg(IC.dl), h("span", {}, "İndir"));
  const show = async () => {
    const f = list[i];
    cnt.textContent = `${i + 1} / ${list.length}`; cap.textContent = f.aciklama || f.ad || "";
    img.classList.remove("on"); img.removeAttribute("src");
    low.src = S.thumbs.get(f.tid || f.fid) || "";
    try { const d = await fileData(f.fid); if (list[i] === f) { img.src = d.url; img.onload = () => img.classList.add("on"); } } catch {}
    if (list[i + 1]) fileData(list[i + 1].fid).catch(() => {});
  };
  const go = (n) => { i = (i + n + list.length) % list.length; show(); };
  const close = () => { wrap.remove(); document.body.classList.remove("modal-open"); document.removeEventListener("keydown", key); };
  const key = (e) => { if (e.key === "Escape") close(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
  const stage = h("div", { class: "lb-stage" }, low, img);
  let x0 = null;
  stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1); x0 = null; });
  const wrap = h("div", { class: "lb", role: "dialog", "aria-modal": "true", "aria-label": "Görsel" },
    h("div", { class: "lb-top" }, cnt, h("div", { class: "lb-tr" }, dl, h("button", { type: "button", class: "lb-x", "aria-label": "Kapat", onclick: close }, svg(IC.x)))),
    stage,
    list.length > 1 ? h("button", { type: "button", class: "lb-nav lb-prev", "aria-label": "Önceki", onclick: () => go(-1) }, svg(IC.back)) : null,
    list.length > 1 ? h("button", { type: "button", class: "lb-nav lb-next", "aria-label": "Sonraki", onclick: () => go(1) }, svg(IC.next)) : null,
    cap);
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target === stage) close(); });
  document.addEventListener("keydown", key);
  document.body.append(wrap); document.body.classList.add("modal-open");
  show(); $(".lb-x", wrap).focus();
}

// ---------------------------------------------------------------- iletişim kutuları
function toast(text, kind = "") {
  const box = $("#toasts"); if (!box) return;
  const t = h("div", { class: `toast ${kind}` }, text); box.append(t);
  setTimeout(() => t.classList.add("in"), 10);
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, kind === "err" ? 7000 : 4000);
}
function modal(build) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const card = h("div", { class: "modal", role: "dialog", "aria-modal": "true" });
    const close = (v) => { wrap.remove(); document.body.classList.remove("modal-open"); prev && prev.focus && prev.focus(); resolve(v); };
    const wrap = h("div", { class: "modal-bg", onclick: (e) => { if (e.target === wrap) close(null); } }, card);
    wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") close(null); });
    build(card, close);
    document.body.append(wrap); document.body.classList.add("modal-open");
    setTimeout(() => (card.querySelector("[autofocus]") || card.querySelector("input,textarea,button"))?.focus(), 30);
  });
}
function confirmBox(text, ok = "Tamam") {
  return modal((card, close) => card.append(h("p", { class: "modal-t" }, text), h("div", { class: "modal-b" },
    h("button", { class: "btn btn-o", type: "button", onclick: () => close(false) }, "Vazgeç"), h("button", { class: "btn btn-d", type: "button", autofocus: true, onclick: () => close(true) }, ok)))).then(Boolean);
}
/** imzalı karar penceresi: ad soyad yazılır, açık metin gösterilir */
function signDialog({ eyebrow, title, text, items, okLabel = "Onaylıyorum", danger = false, note = false, run }) {
  return modal((card, close) => {
    const id = "ad" + Math.random().toString(36).slice(2, 7);
    const nameIn = h("input", { id, autocomplete: "name", autocapitalize: "words", value: (S.sess && S.sess.imza) || "", placeholder: "Adınız soyadınız" });
    const noteIn = note ? h("textarea", { rows: 2, placeholder: "İsterseniz kısa bir not ekleyin", maxlength: 1000 }) : null;
    const msg = h("p", { class: "form-msg", role: "alert" });
    const ok = h("button", { class: `btn ${danger ? "btn-x" : "btn-d"}`, type: "submit" }, okLabel);
    card.classList.add("modal-sign");
    card.append(h("form", { onsubmit: async (e) => {
      e.preventDefault(); msg.textContent = "";
      const ad = nameIn.value.trim();
      if (ad.length < 2) { msg.textContent = "Lütfen adınızı ve soyadınızı yazın."; return nameIn.focus(); }
      if (S.preview) { msg.textContent = C.PORTAL_ERR.onizleme; return; }
      ok.disabled = true; ok.textContent = "Kaydediliyor…";
      try {
        const j = await run(ad, noteIn ? noteIn.value.trim() : "");
        if (S.sess) { S.sess.imza = ad; if (!S.preview) saveSess(S.sess); }
        apply(j); close(true); rerender();
      } catch (err) { msg.textContent = err.message; ok.disabled = false; ok.textContent = okLabel; if (err.code === "oturum") setTimeout(() => logout(err.message), 1500); }
    } },
      h("div", { class: "eyebrow" }, eyebrow), h("h2", { class: "modal-h" }, title),
      items && items.length && items.length > 1 ? h("div", { class: "sign-lh" }, `Kapsam · ${items.length} öğe`) : null,
      items && items.length ? h("ul", { class: "sign-list" }, items.map((x) => h("li", {}, x))) : null,
      h("blockquote", { class: "sign-q" }, text),
      h("div", { class: "f" }, h("label", { for: id }, "Adınız soyadınız"), nameIn, h("small", { class: "help" }, "Yazdığınız ad, tarih ve saatle birlikte kayda geçer.")),
      noteIn ? h("div", { class: "f" }, noteIn) : null, msg,
      h("div", { class: "modal-b" }, h("button", { class: "btn btn-o", type: "button", onclick: () => close(false) }, "Vazgeç"), ok)));
  });
}
async function copy(text, label) {
  try { await navigator.clipboard.writeText(text); toast(`${label} kopyalandı.`, "ok"); }
  catch { const t = h("textarea", { style: { position: "fixed", opacity: 0 } }, text); document.body.append(t); t.select(); try { document.execCommand("copy"); toast(`${label} kopyalandı.`, "ok"); } catch { toast("Kopyalanamadı; elle seçip kopyalayın.", "err"); } t.remove(); }
}

// ---------------------------------------------------------------- yorumlar ve onay kartı
function comments(hedef, { title = "Yorumlar ve sorular" } = {}) {
  const list = M().yorumlar.filter((y) => y.hedef === hedef);
  const ta = h("textarea", { rows: 3, placeholder: "Görüşünüzü veya sorunuzu yazın…", maxlength: 2000, "aria-label": "Yorum" });
  const btn = h("button", { class: "btn btn-o btn-sm", type: "submit" }, "Gönder");
  return sec(title,
    list.length ? h("ol", { class: "cmts" }, list.map((y) => h("li", { class: `cmt ${y.kimden === "vox" ? "vox" : ""}` },
      h("div", { class: "cmt-h" }, h("strong", {}, y.kimden === "vox" ? "VOX Mimarlık" : y.ad || "Siz"), h("time", {}, C.trStamp(y.ts))), h("p", {}, y.metin)))) : h("p", { class: "muted" }, "Henüz yorum yok. Aklınıza takılan her şeyi buraya yazabilirsiniz; bize anında bildirim gelir."),
    h("form", { class: "cmt-f", onsubmit: async (e) => {
      e.preventDefault(); const t = ta.value.trim(); if (!t) return ta.focus();
      if (S.preview) return toast(C.PORTAL_ERR.onizleme, "err");
      btn.disabled = true; btn.textContent = "Gönderiliyor…";
      try { const j = await S.api.call("p_comment", { hedef, metin: t, ad: S.sess && S.sess.imza }); apply(j); toast("Mesajınız iletildi.", "ok"); rerender(); }
      catch (err) { toast(err.message, "err"); btn.disabled = false; btn.textContent = "Gönder"; }
    } }, ta, h("div", { class: "cmt-b" }, h("small", { class: "muted" }, "Mesajınız VOX ekibine anında iletilir."), btn)));
}
function receipt(o) {
  return h("details", { class: "rcpt" },
    h("summary", {}, svg(IC.check), h("span", {}, h("strong", {}, "Onaylandı"), ` · ${C.trStamp(o.ts)} · ${o.ad}`), h("span", { class: "rcpt-more" }, "Makbuz")),
    h("div", { class: "rcpt-b" }, h("p", {}, `“${o.metin}”`), o.dosyalar && o.dosyalar.length ? [h("div", { class: "eyebrow" }, "Onaylanan dosyalar"), h("ul", {}, o.dosyalar.map((f) => h("li", {}, f.ad, f.surum ? h("small", {}, ` · ${f.surum}`) : null)))] : null,
      h("small", { class: "muted" }, `Kayıt no: ${o.id}`)));
}
function approvalBox(hedef, st, { title, files = [], label = "Bu aşamayı onaylıyorum" }) {
  const recs = M().onaylar.filter((o) => o.hedef === hedef);
  const last = recs[recs.length - 1];
  if (st === "onaylandi") return h("div", { class: "appr ok" }, last ? receipt(last) : h("p", {}, svg(IC.check), " Onaylandı"), recs.length > 1 ? h("details", { class: "rcpt-old" }, h("summary", {}, `Önceki onaylar (${recs.length - 1})`), recs.slice(0, -1).reverse().map(receipt)) : null);
  if (st !== "onay") return h("div", { class: "appr wait" }, svg(IC.clock), h("p", {}, st === "devam" ? "Bu aşama üzerinde çalışıyoruz. Hazır olunca onayınıza sunacağız." : "Bu aşama henüz başlamadı."), recs.length ? h("details", { class: "rcpt-old" }, h("summary", {}, "Önceki onaylar"), recs.map(receipt)) : null);
  return h("div", { class: "appr ask" },
    h("div", {}, h("div", { class: "eyebrow" }, "Onayınız bekleniyor"), h("p", { class: "appr-t" }, `${title} hazır. Dosyaları inceledikten sonra onaylayabilir ya da aşağıdan yorum yazabilirsiniz.`)),
    h("button", { class: "btn btn-d btn-lg", type: "button", onclick: () => signDialog({
      eyebrow: "Yazılı onay", title, text: C.ONAY_METNI,
      items: files.map((f) => `${f.ad}${f.surum ? " · " + f.surum : ""}`).slice(0, 12).concat(files.length > 12 ? [`… ve ${files.length - 12} dosya daha`] : []),
      run: (ad) => S.api.call("p_approve", { hedef, ad }),
    }).then((ok) => ok && toast("Onayınız kaydedildi. Teşekkür ederiz.", "ok")) }, svg(IC.check), label),
    recs.length ? h("details", { class: "rcpt-old" }, h("summary", {}, "Önceki onaylar"), recs.map(receipt)) : null);
}

// ---------------------------------------------------------------- GENEL BAKIŞ
function ring(pct, { size = 112, stroke = 6, label = "" } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", `0 0 ${size} ${size}`); s.setAttribute("class", "ring"); s.setAttribute("role", "img"); s.setAttribute("aria-label", label || `%${pct}`);
  s.innerHTML = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="butt" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
  return s;
}
function overview() {
  const p = P(), d = D();
  const hero = h("section", { class: "hero" },
    p.kapak ? h("div", { class: "hero-ph" }, thumb(p.kapak, { alt: p.ad })) : h("div", { class: "hero-ph empty" }),
    h("div", { class: "hero-in" },
      h("div", { class: "hero-tx" },
        h("div", { class: "hero-eb" }, h("span", { class: "eyebrow" }, C.TIP_AD[p.tip] || ""), p.durum ? h("span", { class: "hero-ph-l" }, C.EVRE_AD[p.durum]) : null),
        h("h1", { class: "hero-t" }, p.ad),
        p.konum ? h("p", { class: "hero-s" }, p.konum) : null),
      h("div", { class: "hero-pr" }, h("div", { class: "hero-ring" }, ring(d.ilerleme, { label: `Genel ilerleme %${d.ilerleme}` }), h("div", { class: "hero-pct" }, h("b", {}, `%${d.ilerleme}`), h("small", {}, "tamamlandı"))))));
  const next = d.sonraki ? h("a", { class: `next ${d.sonraki.sizde ? "sizde" : ""}`, href: `#/${navOf(d.sonraki.yer)}${d.sonraki.hedef && d.sonraki.hedef.startsWith("asama:") ? "/" + d.sonraki.hedef.slice(6) : ""}` },
    h("div", { class: "eyebrow" }, d.sonraki.sizde ? "Sıradaki adım · sizde" : "Sıradaki adım"),
    h("div", { class: "next-t" }, d.sonraki.baslik), d.sonraki.metin ? h("p", {}, d.sonraki.metin) : null, h("span", { class: "next-go" }, "Görüntüle", svg(IC.next))) : null;
  const pend = d.bekleyen.length > 1 ? sec(`Sizden beklenenler · ${d.bekleyen.length}`, h("ul", { class: "pend" }, d.bekleyen.map((b) => h("li", {}, h("a", { href: `#/${navOf(b.yer)}${b.hedef && b.hedef.startsWith("asama:") ? "/" + b.hedef.slice(6) : ""}`, class: b.gecikti ? "late" : "" },
    h("span", { class: `pend-k pk-${b.tur}` }, { onay: "Onay", secim: "Seçim", ek: "Karar", odeme: "Ödeme" }[b.tur] || ""), h("span", { class: "pend-t" }, h("strong", {}, b.baslik), b.metin ? h("small", {}, b.metin) : null), svg(IC.next)))))) : null;
  const welcome = p.hosgeldin ? h("p", { class: "welcome" }, p.hosgeldin) : null;
  // evre kartları
  const as = p.asamalar || [];
  const nOn = as.filter((a) => d.asama[a.id] === "onaylandi").length;
  const tiles = [];
  tiles.push(["baslangic", "00", "Başlangıç", "Rehber, form ve teklif", null]);
  if (hasT()) tiles.push(["tasarim", "01", "Tasarım", `${nOn} / ${as.length} aşama onaylandı`, as.length ? Math.round((nOn / as.length) * 100) : 0]);
  if (hasT() && hasU()) tiles.push(["gecis", "02", "Uygulamaya geçiş", d.gecis === "onaylandi" ? "Uygulama teklifi onaylandı" : C.ASAMA_DURUM[d.gecis], d.gecis === "onaylandi" ? 100 : 0]);
  if (hasU()) tiles.push(["takvim", "03", "Uygulama", `İş takvimi %${d.uygulama}`, d.uygulama]);
  tiles.push(["teslim", hasU() ? "04" : "02", "Teslim", d.eksik.toplam ? `Eksik listesi ${d.eksik.yapilan} / ${d.eksik.toplam}` : (d.tutanak === "onaylandi" ? "Teslim edildi" : "Proje sonunda"), d.eksik.toplam ? Math.round((d.eksik.yapilan / d.eksik.toplam) * 100) : null]);
  const phase = sec("Proje aşamaları", h("div", { class: "phases" }, tiles.map(([k, n, t, s, pct]) => h("a", { class: `phase ${p.durum === k || (k === "takvim" && p.durum === "uygulama") ? "cur" : ""}`, href: `#/${k}` },
    h("span", { class: "phase-n" }, n), h("span", { class: "phase-t" }, t), h("small", {}, s), pct != null ? h("span", { class: "bar" }, h("i", { style: { width: pct + "%" } })) : null))));
  const quick = [];
  if (hasU()) {
    const lastR = (p.raporlar || [])[0];
    if (lastR) quick.push(h("a", { class: "qcard", href: "#/raporlar" }, h("div", { class: "eyebrow" }, "Son haftalık rapor"), h("strong", {}, lastR.baslik), h("small", {}, C.trDate(lastR.tarih))));
  }
  const o = d.odeme;
  if (o.toplam) quick.push(h("a", { class: "qcard", href: "#/odemeler" }, h("div", { class: "eyebrow" }, "Ödemeler"), h("strong", {}, `%${o.oran} ödendi`), h("small", {}, `Kalan ${C.money(o.kalan)}`), h("span", { class: "bar" }, h("i", { style: { width: o.oran + "%" } }))));
  const log = (M().log || []).slice(-5).reverse();
  const act = log.length ? sec("Son hareketler", h("ol", { class: "log" }, log.map(logItem)), h("a", { class: "more", href: "#/kayit" }, "Tüm hareketler", svg(IC.next))) : null;
  phase.classList.add("phase-sec");
  return [hero, h("div", { class: "wrap ovw" }, h("div", { class: "ov" }, h("div", { class: "ov-main" }, next, pend, welcome), h("aside", { class: "ov-side" }, quick.length ? h("div", { class: "quick" }, quick) : null, act)), phase)];
}
function logItem(l) { return h("li", { class: `log-i ${l.kim}` }, h("span", { class: "log-d" }), h("div", {}, h("p", {}, l.ne), h("small", {}, `${l.kim === "vox" ? "VOX" : l.kim === "musteri" ? "Siz" : l.kim} · ${C.trStamp(l.ts)}`))); }
function logPage() { return h("div", { class: "wrap" }, head("Kayıt", "Proje hareketleri", "Kim, ne zaman, ne yaptı — en yeni üstte."), h("ol", { class: "log big" }, (M().log || []).slice().reverse().map(logItem))); }

// ---------------------------------------------------------------- BAŞLANGIÇ
function startPage() {
  const b = P().baslangic || {};
  return h("div", { class: "wrap narrow" }, head("00 · Başlangıç", "Hoş geldiniz", P().hosgeldin || ""),
    b.rehber ? sec("Süreç rehberi", fileRows([b.rehber])) : null,
    b.formUrl ? sec("Ön bilgi formu", h("div", { class: "card row" }, h("div", {}, h("strong", {}, "Tasarım ön bilgi formu"), h("p", { class: "muted" }, b.formTamam ? "Formu doldurdunuz, teşekkürler." : "Yaklaşık 10 dakika sürer; ihtiyaçlarınızı doğru anlamamıza yardımcı olur.")),
      b.formTamam ? chip("Dolduruldu", "st-onaylandi") : h("a", { class: "btn btn-d btn-sm", href: b.formUrl, target: "_blank", rel: "noopener" }, "Formu doldur"))) : null,
    (b.dosyalar || []).length ? sec("Teklif ve sözleşme", fileRows(b.dosyalar)) : null,
    comments("genel", { title: "Bize yazın" }));
}

// ---------------------------------------------------------------- TASARIM
function designPage() {
  const as = P().asamalar || [], d = D();
  return h("div", { class: "wrap" }, head("01 · Tasarım", "Tasarım aşamaları", "Her aşama sizin yazılı onayınızla kapanır. Bir aşama içinde, beğenene kadar birlikte çalışırız."),
    h("ol", { class: "stages" }, as.map((a, i) => {
      const st = d.asama[a.id];
      const imgs = (a.dosyalar || []).filter((f) => C.fileKind(f) === "gorsel");
      return h("li", {}, h("a", { class: `stage st-${st}`, href: `#/tasarim/${encodeURIComponent(a.id)}` },
        h("span", { class: "stage-n" }, String(i + 1).padStart(2, "0")),
        h("div", { class: "stage-b" }, h("div", { class: "stage-h" }, h("h2", {}, a.ad), statusChip(st)),
          a.aciklama ? h("p", {}, a.aciklama) : null,
          imgs.length ? h("div", { class: "stage-th" }, imgs.slice(0, 4).map((f) => thumb(f)), imgs.length > 4 ? h("span", { class: "stage-more" }, `+${imgs.length - 4}`) : null) : null,
          h("small", { class: "muted" }, [(a.dosyalar || []).length ? `${(a.dosyalar || []).length} dosya` : "", (a.toplantilar || []).length ? `${a.toplantilar.length} toplantı özeti` : "", a.tarih ? C.trDate(a.tarih) : ""].filter(Boolean).join(" · "))),
        svg(IC.next)));
    })));
}
function meetings(list) {
  if (!list || !list.length) return null;
  return sec("Toplantı özetleri", list.map((t) => h("article", { class: "meet" },
    h("div", { class: "meet-h" }, h("strong", {}, t.baslik || "Toplantı"), h("span", { class: "muted" }, C.trDate(t.tarih)), ornek(t)),
    h("div", { class: "meet-g" },
      h("div", {}, h("div", { class: "eyebrow" }, "Karar verilenler"), h("ul", { class: "ticks" }, (t.kararlar || []).map((x) => h("li", {}, x)))),
      (t.acik || []).length ? h("div", {}, h("div", { class: "eyebrow" }, "Açık kalanlar"), h("ul", { class: "opens" }, t.acik.map((x) => h("li", {}, x)))) : null,
      t.sonraki ? h("div", {}, h("div", { class: "eyebrow" }, "Sonraki adım"), h("p", {}, t.sonraki)) : null))));
}
function stagePage(id) {
  const as = P().asamalar || [], i = as.findIndex((a) => a.id === id);
  if (i < 0) return designPage();
  const a = as[i], st = D().asama[a.id], files = a.dosyalar || [];
  const prev = as[i - 1], next = as[i + 1];
  return h("div", { class: "wrap" },
    h("a", { class: "back", href: "#/tasarim" }, svg(IC.back), "Tasarım aşamaları"),
    h("div", { class: "phead row" }, h("div", {}, h("div", { class: "eyebrow" }, `Aşama ${String(i + 1).padStart(2, "0")} / ${String(as.length).padStart(2, "0")}`), h("h1", { class: "phead-t" }, a.ad), a.aciklama ? h("p", { class: "phead-s" }, a.aciklama) : null), statusChip(st)),
    approvalBox("asama:" + a.id, st, { title: a.ad, files: files.concat(a.sunumlar || []) }),
    gallery(files) ? sec(`Görseller · ${files.filter((f) => C.fileKind(f) === "gorsel").length}`, gallery(files)) : null,
    presentations(a.sunumlar),
    fileRows(files) ? sec("Dosyalar", fileRows(files)) : null,
    meetings(a.toplantilar),
    comments("asama:" + a.id),
    h("nav", { class: "pager" }, prev ? h("a", { href: `#/tasarim/${encodeURIComponent(prev.id)}` }, svg(IC.back), h("span", {}, h("small", {}, "Önceki"), prev.ad)) : h("span"),
      next ? h("a", { class: "nx", href: `#/tasarim/${encodeURIComponent(next.id)}` }, h("span", {}, h("small", {}, "Sonraki"), next.ad), svg(IC.next)) : h("span")));
}

// ---------------------------------------------------------------- GEÇİŞ
function transitionPage() {
  const g = P().gecis || {}, st = D().gecis;
  return h("div", { class: "wrap narrow" }, head("02 · Uygulamaya geçiş", "Uygulama teklifi", g.aciklama || "Tasarım onaylarınızdan sonra uygulama (anahtar teslim) teklifimiz."),
    approvalBox("gecis", st, { title: "Uygulama teklifi", files: g.dosyalar || [], label: "Teklifi onaylıyorum" }),
    sec("Teklif dosyaları", fileRows(g.dosyalar || []) || h("p", { class: "muted" }, "Teklif hazırlanınca burada görünecek.")),
    comments("gecis"));
}

// ---------------------------------------------------------------- İŞ TAKVİMİ
function schedulePage() {
  const tk = P().takvim || [], d = D();
  const G = C.gantt(tk, d.today);
  const chart = tk.length ? h("div", { class: "gantt", role: "img", "aria-label": "İş takvimi grafiği" },
    h("div", { class: "g-months" }, G.months.map((m) => h("span", { style: { left: m.left + "%" } }, m.label))),
    G.today != null ? h("div", { class: "g-ov" }, h("div", { class: "g-today", style: { left: G.today + "%" } }, h("span", {}, "Bugün"))) : null,
    tk.map((t, i) => h("div", { class: "g-row" }, h("div", { class: "g-name" }, t.ad), h("div", { class: "g-track" },
      h("div", { class: `g-bar ${Number(t.yuzde) >= 100 ? "done" : Number(t.yuzde) > 0 ? "run" : ""}`, style: { left: G.rows[i].left + "%", width: G.rows[i].width + "%" } }, h("i", { style: { width: (Number(t.yuzde) || 0) + "%" } })))))) : null;
  return h("div", { class: "wrap" }, head("03 · Uygulama", "İş takvimi", tk.length ? `${C.trDate(G.start)} – ${C.trDate(G.end)} · genel ilerleme %${d.uygulama}` : "Takvim hazırlanınca burada görünecek."),
    tk.length ? h("div", { class: "sumrow" }, h("div", { class: "big-pct" }, h("b", {}, `%${d.uygulama}`), h("small", {}, "uygulama tamamlandı")), h("span", { class: "bar wide" }, h("i", { style: { width: d.uygulama + "%" } }))) : null,
    chart ? sec("Zaman çizelgesi", h("div", { class: "gantt-w" }, chart)) : null,
    tk.length ? sec("İş kalemleri", h("ol", { class: "tlist" }, tk.map((t) => {
      const y = Number(t.yuzde) || 0;
      const late = y < 100 && t.bit && t.bit < d.today;
      return h("li", { class: late ? "late" : "" }, h("div", { class: "tl-h" }, h("strong", {}, t.ad), h("span", { class: `tl-p ${y >= 100 ? "ok" : ""}` }, y >= 100 ? [svg(IC.check), "Tamamlandı"] : `%${y}`)),
        h("small", { class: "muted" }, `${C.trDate(t.bas, { year: false })} – ${C.trDate(t.bit)}${late ? " · gecikmede" : ""}`), y < 100 ? h("span", { class: "bar" }, h("i", { style: { width: y + "%" } })) : null, t.not ? h("p", { class: "muted" }, t.not) : null);
    }))) : null);
}

// ---------------------------------------------------------------- HAFTALIK RAPORLAR
function reportsPage() {
  const rs = P().raporlar || [];
  return h("div", { class: "wrap narrow" }, head("03 · Uygulama", "Haftalık raporlar", "Şantiyeden haftalık kısa özet ve fotoğraflar."),
    rs.length ? h("div", { class: "feed" }, rs.map((r) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(r.tarih || "") || [];
      return h("article", { class: "rep", id: "r-" + r.id },
        h("div", { class: "rep-d" }, h("b", {}, m[3] ? String(Number(m[3])) : ""), h("span", {}, C.trDate(r.tarih, { short: true }).split(" ")[1] || "")),
        h("div", { class: "rep-b" }, h("div", { class: "rep-h" }, h("h2", {}, r.baslik || C.trDate(r.tarih)), ornek(r)),
          h("p", {}, r.metin), gallery(r.fotolar || [], { cols: "g3", caption: false }),
          h("small", { class: "muted" }, C.trDate(r.tarih, { day: true }))));
    })) : h("p", { class: "empty" }, "İlk rapor uygulama başlayınca burada olacak."));
}

// ---------------------------------------------------------------- MALZEME SEÇİMLERİ
function selectionsPage() {
  const ss = P().secimler || [], d = D();
  const waiting = ss.filter((s) => !d.secim[s.id]).length;
  return h("div", { class: "wrap" }, head("03 · Uygulama", "Malzeme seçimleri", waiting ? `${waiting} kalem seçiminizi bekliyor. Seçimler sipariş tarihlerine göre sıralıdır.` : "Tüm seçimleriniz tamamlandı. Teşekkür ederiz."),
    ss.slice().sort((a, b) => (d.secim[a.id] ? 1 : 0) - (d.secim[b.id] ? 1 : 0) || String(a.sonTarih || "9").localeCompare(String(b.sonTarih || "9"))).map((s) => {
      const ch = d.secim[s.id], days = C.daysUntil(s.sonTarih);
      const dl = s.sonTarih ? chip(ch ? `Son tarih ${C.trDate(s.sonTarih, { short: true })}` : days < 0 ? `Son tarih geçti · ${C.trDate(s.sonTarih, { short: true })}` : days === 0 ? "Son gün bugün" : `Son tarih ${C.trDate(s.sonTarih, { short: true })} · ${days} gün`, ch ? "" : days < 0 ? "st-late" : days <= 3 ? "st-onay" : "") : null;
      return h("section", { class: `sel ${ch ? "done" : ""}` },
        h("div", { class: "sel-h" }, h("div", {}, h("h2", {}, s.kalem), h("small", { class: "muted" }, [s.mahal, s.aciklama].filter(Boolean).join(" · "))), ch ? chip("Seçildi", "st-onaylandi") : dl),
        h("div", { class: "opts" }, (s.secenekler || []).map((o) => {
          const picked = ch && ch.secenek === o.id;
          return h("div", { class: `opt ${picked ? "picked" : ""} ${ch && !picked ? "dim" : ""}` },
            o.foto ? h("button", { type: "button", class: "opt-ph", "aria-label": `${o.ad} — büyüt`, onclick: () => lightbox([o.foto], 0) }, thumb(o.foto, { alt: o.ad })) : h("div", { class: "opt-ph none" }),
            h("div", { class: "opt-b" }, h("strong", {}, o.ad), o.aciklama ? h("small", { class: "muted" }, o.aciklama) : null,
              o.fark ? h("small", { class: "opt-f" }, `${o.fark > 0 ? "+" : ""}${C.money(o.fark)} fark`) : null,
              picked ? h("div", { class: "opt-ok" }, svg(IC.check), `Seçiminiz · ${C.trStamp(ch.ts)} · ${ch.ad}`) : null,
              !ch ? h("button", { class: "btn btn-o btn-sm btn-block", type: "button", onclick: () => signDialog({
                eyebrow: "Malzeme seçimi", title: `${s.kalem}: ${o.ad}`, text: "Bu seçeneği seçiyorum ve onaylıyorum. Sipariş verildikten sonra yapılacak değişiklik ek iş sayılabilir.",
                items: o.fark ? [`Fiyat farkı: ${C.money(o.fark)}`] : null, okLabel: "Seçiyorum",
                run: (ad) => S.api.call("p_choose", { secim: s.id, secenek: o.id, ad }),
              }).then((ok) => ok && toast("Seçiminiz kaydedildi.", "ok")) }, "Bunu seç") : null));
        })));
    }),
    !ss.length ? h("p", { class: "empty" }, "Seçim yapılacak malzeme olduğunda burada göreceksiniz.") : null);
}

// ---------------------------------------------------------------- EK İŞLER
function changesPage() {
  const es = P().ekIsler || [], d = D(), K = M().ekKararlar || {};
  const onay = es.filter((e) => d.ek[e.id] === "onay");
  return h("div", { class: "wrap narrow" }, head("03 · Uygulama", "Ek iş ve değişiklik talepleri", "Sözleşme dışındaki her iş, fiyatı ve süreye etkisiyle burada onayınıza sunulur."),
    onay.length ? h("div", { class: "sumrow" }, h("div", { class: "big-pct" }, h("b", {}, C.money(onay.reduce((a, e) => a + (Number(e.tutar) || 0), 0))), h("small", {}, `onaylanan ${onay.length} ek iş`))) : null,
    es.map((e) => {
      const st = d.ek[e.id], k = K[e.id];
      return h("article", { class: `chg st-${st}` },
        h("div", { class: "chg-h" }, h("h2", {}, e.baslik), chip({ onay: "Onaylandı", red: "Onaylanmadı", bekliyor: "Kararınızı bekliyor", iptal: "İptal" }[st], st === "onay" ? "st-onaylandi" : st === "red" ? "st-red" : st === "bekliyor" ? "st-onay" : "")),
        e.aciklama ? h("p", {}, e.aciklama) : null,
        h("dl", { class: "chg-f" }, h("div", {}, h("dt", {}, "Tutar"), h("dd", {}, e.tutar ? C.money(e.tutar) : "—")), e.gun ? h("div", {}, h("dt", {}, "Süreye etkisi"), h("dd", {}, `+${e.gun} gün`)) : null, e.tarih ? h("div", {}, h("dt", {}, "Talep tarihi"), h("dd", {}, C.trDate(e.tarih))) : null),
        fileRows(e.dosyalar || []),
        k ? h("p", { class: "chg-k" }, svg(st === "onay" ? IC.check : IC.x), `${st === "onay" ? "Onaylandı" : "Onaylanmadı"} · ${C.trStamp(k.ts)} · ${k.ad}${k.not ? " — “" + k.not + "”" : ""}`) : null,
        st === "bekliyor" ? h("div", { class: "chg-b" },
          h("button", { class: "btn btn-o", type: "button", onclick: () => signDialog({ eyebrow: "Ek iş kararı", title: e.baslik, text: "Bu ek işi onaylamıyorum.", okLabel: "Onaylamıyorum", danger: true, note: true,
            run: (ad, not) => S.api.call("p_change_decision", { ek: e.id, karar: "red", ad, not }) }).then((ok) => ok && toast("Kararınız kaydedildi.", "ok")) }, "Onaylamıyorum"),
          h("button", { class: "btn btn-d", type: "button", onclick: () => signDialog({ eyebrow: "Ek iş onayı", title: e.baslik, text: `Bu ek işi ${e.tutar ? C.money(e.tutar) + " bedelle " : ""}${e.gun ? "ve +" + e.gun + " gün süre etkisiyle " : ""}onaylıyorum.`, note: true,
            run: (ad, not) => S.api.call("p_change_decision", { ek: e.id, karar: "onay", ad, not }) }).then((ok) => ok && toast("Onayınız kaydedildi.", "ok")) }, svg(IC.check), "Onaylıyorum")) : null);
    }),
    !es.length ? h("p", { class: "empty" }, "Şu an ek iş talebi yok.") : null);
}

// ---------------------------------------------------------------- ÖDEMELER
function paymentsPage() {
  const od = P().odeme || {}, d = D(), o = d.odeme, tl = od.taksitler || [];
  const nx = tl.find((t) => t.id === o.siradaki);
  const summary = h("div", { class: "pay-sum" },
    h("div", { class: "pay-ring" }, ring(o.oran, { size: 168, stroke: 7, label: `Ödenen %${o.oran}` }), h("div", { class: "pay-ring-t" }, h("b", {}, `%${o.oran}`), h("small", {}, "ödendi"))),
    h("dl", { class: "pay-l" },
      h("div", { class: "pl-o" }, h("dt", {}, "Ödenen"), h("dd", {}, C.money(o.odenen))),
      h("div", { class: "pl-k" }, h("dt", {}, "Kalan"), h("dd", {}, C.money(o.kalan))),
      h("div", { class: "pl-t" }, h("dt", {}, "Toplam"), h("dd", {}, C.money(o.toplam)))));
  let next = null;
  if (nx) {
    const st = d.taksit[nx.id], days = C.daysUntil(nx.vade), desc = C.payText(od.aciklama, nx, P());
    const recs = (M().dekontlar || []).filter((x) => x.taksit === nx.id);
    next = h("section", { class: `pay-next ${st}` },
      h("div", { class: "pn-top" }, h("div", { class: "eyebrow" }, st === "gecikti" ? "Ödeme günü geçti" : st === "inceleniyor" ? "Dekontunuz inceleniyor" : "Sıradaki ödeme"),
        h("div", { class: "pn-amt" }, C.money(nx.tutar)), h("div", { class: "pn-l" }, nx.ad),
        h("div", { class: "pn-due" }, svg(IC.cal), `${C.trDate(nx.vade, { day: true })}`, days != null ? h("span", { class: "pn-days" }, days > 0 ? `${days} gün kaldı` : days === 0 ? "bugün" : `${-days} gün geçti`) : null)),
      od.iban ? h("div", { class: "pn-bank" },
        h("div", { class: "pn-row" }, h("div", {}, h("small", {}, "IBAN" + (od.ibanOrnek ? " (örnek)" : "")), h("code", {}, C.ibanPretty(od.iban))), h("button", { class: "copy", type: "button", onclick: () => copy(C.ibanCompact(od.iban), "IBAN") }, svg(IC.copy), "Kopyala")),
        od.alici ? h("div", { class: "pn-row" }, h("div", {}, h("small", {}, "Alıcı"), h("span", {}, od.alici)), h("button", { class: "copy", type: "button", onclick: () => copy(od.alici, "Alıcı adı") }, svg(IC.copy), "Kopyala")) : null,
        od.banka ? h("div", { class: "pn-row" }, h("div", {}, h("small", {}, "Banka"), h("span", {}, od.banka))) : null,
        h("div", { class: "pn-row" }, h("div", {}, h("small", {}, "Açıklama"), h("span", {}, desc)), h("button", { class: "copy", type: "button", onclick: () => copy(desc, "Açıklama") }, svg(IC.copy), "Kopyala"))) : null,
      st !== "inceleniyor" ? h("div", { class: "pn-up" }, h("p", {}, "Ödemeyi yaptıktan sonra dekontu yükleyin; kontrol edip onaylayalım."), receiptButton(nx)) : h("p", { class: "pn-wait" }, svg(IC.clock), "Dekontunuz bize ulaştı. Kontrol edip onaylayınca burada “Ödendi” görünecek."),
      recs.length ? h("small", { class: "pn-r" }, recs.map((r) => `${r.ad} · ${C.trStamp(r.ts)} · ${{ bekliyor: "inceleniyor", onaylandi: "onaylandı", red: "kabul edilmedi" }[r.durum]}`).join(" — ")) : null);
  }
  const rows = h("ol", { class: "inst" }, tl.map((t, i) => {
    const st = d.taksit[t.id];
    return h("li", { class: `inst-i is-${st} ${t.id === o.siradaki ? "nx" : ""}` },
      h("span", { class: "inst-n" }, String(i + 1).padStart(2, "0")),
      h("div", { class: "inst-b" }, h("strong", {}, t.ad), h("small", {}, st === "odendi" ? `Ödendi · ${C.trDate(t.odemeTarihi || t.vade)}` : `Vade · ${C.trDate(t.vade)}`)),
      h("div", { class: "inst-r" }, h("span", { class: "inst-a" }, C.money(t.tutar)), chip(C.TAKSIT_DURUM[st], "ps-" + st)));
  }));
  const deks = (M().dekontlar || []).slice().reverse();
  return h("div", { class: "wrap" }, head("Ödemeler", "Ödeme takvimi", od.not || ""),
    h("div", { class: "pay-top" }, summary, next || h("section", { class: "pay-next done" }, h("div", { class: "eyebrow" }, "Ödemeler"), h("div", { class: "pn-amt" }, "Tamamlandı"), h("p", {}, "Tüm ödemeleriniz alındı. Teşekkür ederiz."))),
    o.ekOnayli ? h("p", { class: "muted pay-ek" }, `Onayladığınız ek işlerin toplamı: ${C.money(o.ekOnayli)}. `, h("a", { href: "#/ekisler" }, "Ek işleri gör")) : null,
    sec("Taksitler", rows),
    deks.length ? sec("Yüklediğiniz dekontlar", h("div", { class: "files" }, deks.map((x) => {
      const b = h("button", { type: "button", class: "frow", onclick: () => download({ fid: x.fid, ad: x.ad }, b) }, h("span", { class: "fic" }, "DEK"),
        h("span", { class: "fmeta" }, h("span", { class: "fname" }, x.ad), h("small", {}, `${(tl.find((t) => t.id === x.taksit) || {}).ad || ""} · ${C.trStamp(x.ts)}`)),
        chip({ bekliyor: "İnceleniyor", onaylandi: "Onaylandı", red: "Kabul edilmedi" }[x.durum], x.durum === "onaylandi" ? "ps-odendi" : x.durum === "red" ? "ps-gecikti" : "ps-inceleniyor"));
      return b;
    }))) : null);
}
function receiptButton(t) {
  const btn = h("button", { class: "btn btn-k", type: "button" }, svg(IC.up), "Dekont yükle");
  btn.addEventListener("click", async () => {
    if (S.preview) return toast(C.PORTAL_ERR.onizleme, "err");
    const f = await pick("image/*,application/pdf"); if (!f) return;
    btn.disabled = true; btn.textContent = "Hazırlanıyor…";
    try {
      let blob = f, mime = f.type || "application/octet-stream", name = f.name || "dekont";
      if (mime.startsWith("image/") && !/heic/i.test(mime)) { blob = await shrink(f, 1800, 0.82); mime = "image/jpeg"; name = name.replace(/\.\w+$/, "") + ".jpg"; }
      if (blob.size > 4 * 1024 * 1024) throw new Error(C.PORTAL_ERR.buyuk);
      btn.textContent = "Yükleniyor…";
      const b64 = await toB64(blob);
      const j = await S.api.call("p_upload_receipt", { taksit: t.id, name, mime, b64 });
      apply(j); toast("Dekontunuz yüklendi. Teşekkür ederiz.", "ok"); rerender();
    } catch (e) { toast(e.message || "Yüklenemedi.", "err"); btn.disabled = false; btn.replaceChildren(svg(IC.up), "Dekont yükle"); }
  });
  return btn;
}
function pick(accept) { return new Promise((res) => { const i = h("input", { type: "file", accept, style: { position: "fixed", left: "-9999px" } }); i.addEventListener("change", () => { res(i.files[0] || null); i.remove(); }); i.addEventListener("cancel", () => { res(null); i.remove(); }); document.body.append(i); i.click(); }); }
async function shrink(file, max, q) {
  let src; try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { src = await new Promise((r, j) => { const im = new Image(); im.onload = () => r(im); im.onerror = () => j(new Error("Fotoğraf açılamadı.")); im.src = URL.createObjectURL(file); }); }
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight, k = Math.min(1, max / Math.max(w0, h0));
  const cv = document.createElement("canvas"); cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
  const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(src, 0, 0, cv.width, cv.height);
  return await new Promise((r) => cv.toBlob(r, "image/jpeg", q));
}
const toB64 = (b) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = rej; fr.readAsDataURL(b); });

// ---------------------------------------------------------------- TESLİM
function handoverPage() {
  const t = P().teslim || {}, d = D(), ek = t.eksikler || [];
  const files = t.dosyalar || [];
  const dlAll = files.length > 1 ? h("button", { class: "btn btn-o btn-sm", type: "button", onclick: async (e) => {
    const b = e.currentTarget; b.disabled = true;
    for (const f of files) { await download(f); await new Promise((r) => setTimeout(r, 700)); }
    b.disabled = false; toast("Dosyalar indirildi.", "ok");
  } }, svg(IC.dl), "Tümünü indir") : null;
  const groups = {};
  for (const x of ek) (groups[x.mahal || "Genel"] ||= []).push(x);
  for (const g of Object.values(groups)) g.sort((a, b) => (a.yapildi ? 1 : 0) - (b.yapildi ? 1 : 0));
  const gorder = Object.entries(groups).sort((a, b) => (a[1].every((x) => x.yapildi) ? 1 : 0) - (b[1].every((x) => x.yapildi) ? 1 : 0));
  const pct = ek.length ? Math.round((d.eksik.yapilan / ek.length) * 100) : 0;
  return h("div", { class: "wrap" }, head(hasU() ? "04 · Teslim" : "Teslim", "Teslim", d.tutanak === "onaylandi" ? "Projeniz teslim edildi. Yeni evinizde mutlu günler dileriz." : "Son kontroller, belgeler ve teslim tutanağı."),
    t.tutanak ? sec("Teslim tutanağı", approvalBox("tutanak", d.tutanak, { title: "Teslim tutanağı", files: (t.tutanak || {}).dosyalar || [], label: "Teslim aldım, onaylıyorum" }), fileRows((t.tutanak || {}).dosyalar || [])) : null,
    ek.length ? sec("Eksik listesi",
      h("div", { class: "sumrow" }, h("div", { class: "big-pct" }, h("b", {}, `${d.eksik.yapilan} / ${ek.length}`), h("small", {}, "kalem tamamlandı")), h("span", { class: "bar wide" }, h("i", { style: { width: pct + "%" } }))),
      h("div", { class: "punch" }, gorder.map(([g, xs]) => h("div", { class: "punch-g" }, h("div", { class: "eyebrow" }, g),
        h("ul", {}, xs.map((x) => h("li", { class: x.yapildi ? "done" : "" }, h("span", { class: "pchk" }, x.yapildi ? svg(IC.check) : null), h("span", {}, x.metin))))))),
      comments("teslim", { title: "Eksik listesi hakkında" })) : null,
    files.length ? h("section", { class: "sec" }, h("div", { class: "sec-hr" }, h("h2", { class: "sec-h eyebrow" }, "Teslim dosyaları"), dlAll), gallery(files, { cols: "g3" }), fileRows(files)) : null,
    (t.belgeler || []).length ? sec("Garanti ve kullanım belgeleri", fileRows(t.belgeler)) : null,
    (t.karsilastirma || []).length ? sec("Tasarım ve sonuç", h("div", { class: "cmp" }, t.karsilastirma.map((c) => h("figure", { class: "cmp-i" },
      h("div", { class: "cmp-p" }, [[c.a, c.aEt], [c.b, c.bEt]].map(([f, et]) => f ? h("button", { type: "button", class: "cmp-ph", onclick: () => lightbox([c.a, c.b].filter(Boolean), f === c.a ? 0 : 1) }, thumb(f), h("span", { class: "cmp-l" }, et || "")) : null)),
      h("figcaption", {}, c.baslik)))), t.karsilastirmaNot ? h("p", { class: "muted" }, t.karsilastirmaNot) : null) : null,
    (t.degerlendirmeUrl || t.yorumUrl) ? h("section", { class: "rate" }, h("div", { class: "eyebrow" }, "Görüşünüz bizim için değerli"), h("h2", {}, "Bizimle çalışmak nasıldı?"),
      h("p", {}, "İki dakikanızı ayırıp deneyiminizi paylaşırsanız çok seviniriz."),
      h("div", { class: "rate-b" }, t.degerlendirmeUrl ? h("a", { class: "btn btn-k", href: t.degerlendirmeUrl, target: "_blank", rel: "noopener" }, "Değerlendirme formu") : null,
        t.yorumUrl ? h("a", { class: "btn btn-ok", href: t.yorumUrl, target: "_blank", rel: "noopener" }, svg(IC.star), "Google'da yorum yazın") : null)) : null);
}

boot();
