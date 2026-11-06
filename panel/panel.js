// VOX Panel — arayüz. Çerçevesiz, derleme adımı yok. Çekirdek: panel-core.js
import * as C from "./panel-core.js";
import { musterilerPage, MUSTERI_ICON } from "./musteriler.js";

const CFG = window.VOX_PANEL || {};
const LIVE = CFG.live || C.LIVE;
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const BRANCH_OVERRIDE = LOCAL ? new URLSearchParams(location.search).get("branch") : null; // yalnız yerel testte
const STORE_KEY = "vox-panel-oturum";

// ---------------------------------------------------------------- küçük DOM yardımcıları
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
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  ozet: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  talepler: '<path d="M3.5 13.5 6.2 5h11.6l2.7 8.5V19h-17z"/><path d="M3.5 13.5h5.2l1.3 2.4h4l1.3-2.4h5.2"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  phone: '<path d="M5.5 4h3l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7l1.3-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 4 5.6 1.5 1.5 0 0 1 5.5 4z"/>',
  wa: '<path d="M20.5 11.6a8.6 8.6 0 0 1-12.6 7.6L3 20.7l1.5-4.8a8.6 8.6 0 1 1 16-4.3Z"/><path d="m8.2 7.7 1.4-.4 1.3 2.6-1.1 1a8.4 8.4 0 0 0 3.2 3.2l1-1.1 2.6 1.3-.4 1.4c-.2.7-.9 1-1.6.9-4.5-.8-7.2-3.5-8-8-.1-.7.2-1.4.9-1.6Z"/>',
  projeler: '<rect x="3.5" y="3.5" width="7" height="7"/><rect x="13.5" y="3.5" width="7" height="7"/><rect x="3.5" y="13.5" width="7" height="7"/><rect x="13.5" y="13.5" width="7" height="7"/>',
  blog: '<path d="M5 3.5h10l4 4v13H5z"/><path d="M15 3.5v4h4M8 12h8M8 15.5h8M8 9h4"/>',
  sss: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.7"/><circle cx="12" cy="16.8" r=".4" fill="currentColor"/>',
  hizmetler: '<path d="M12 3.5 21 8l-9 4.5L3 8z"/><path d="m3 12 9 4.5 9-4.5M3 16l9 4.5 9-4.5"/>',
  surec: '<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/><path d="M6.8 12h3.4M13.8 12h3.4"/>',
  ayarlar: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  back: '<path d="M15 5 8 12l7 7"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', drag: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="2.6"/>',
  img: '<rect x="3.5" y="5" width="17" height="14"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 16-5-5-8 8"/>', eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  out: '<path d="M14 4H5v16h9M10 12h10M17 9l3 3-3 3"/>', user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  kullanicilar: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.7-3.3 3-5 6-5s5.3 1.7 6 5"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.8c1.7.6 2.9 2.2 3.4 4.7"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>', lock: '<rect x="5" y="10.5" width="14" height="10"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
};
IC.musteriler = MUSTERI_ICON;
let uid = 0; const nid = (p = "f") => `${p}${++uid}`;

// ---------------------------------------------------------------- durum
const S = {
  sess: null, gh: null, dirty: false, curHash: "",
  projects: null, manifest: null, taken: null,
  pending: new Map(),   // src/uploads/x.jpg -> {blobSha, url}  (kaydedilmemiş yeni fotoğraflar)
  urls: new Map(),      // /uploads/x.jpg -> nesne URL'si (önbellek)
  poll: null, pollSha: null, pollAt: 0,
  leadRows: null, leadAt: 0, leadTimer: null, leadState: null, leadView: null, leadBusy: () => false, leadRender: () => {},
};

// ---------------------------------------------------------------- oturum
function loadSession() {
  for (const st of [sessionStorage, localStorage]) {
    try {
      const s = JSON.parse(st.getItem(STORE_KEY) || "null");
      if (s && s.token) {
        if (s.exp && Date.now() > s.exp) { st.removeItem(STORE_KEY); return { expired: true }; }
        if (s.sv !== 2) { st.removeItem(STORE_KEY); return { upgraded: true }; } // eski oturum: yeniden giriş (v2 geçişi için)
        return s;
      }
    } catch {}
  }
  return null;
}
const SESS_KEYS = ["token", "repo", "branch", "talepler", "name", "email", "role", "k", "legacy", "mustChange"];
function saveSession(s, remember) {
  const st = remember ? localStorage : sessionStorage;
  const o = { sv: 2 }; for (const k of SESS_KEYS) o[k] = s[k] ?? null;
  o.exp = Date.now() + (remember ? 30 * 864e5 : 12 * 36e5);
  st.setItem(STORE_KEY, JSON.stringify(o));
  return o;
}
/** Oturumu yerinde güncelle (hangi depodaysa orada, süre korunur) */
function updateSession(patch) {
  Object.assign(S.sess || {}, patch);
  for (const st of [sessionStorage, localStorage]) {
    try { const s = JSON.parse(st.getItem(STORE_KEY) || "null"); if (s && s.token) { Object.assign(s, patch); st.setItem(STORE_KEY, JSON.stringify(s)); } } catch {}
  }
}
function clearSession() { sessionStorage.removeItem(STORE_KEY); localStorage.removeItem(STORE_KEY); }
function logout(msg) {
  clearSession(); stopPoll(); stopLeadPoll();
  S.sess = S.gh = S.projects = S.manifest = S.taken = null; S.dirty = false; S.pending.clear();
  S.leadRows = null; S.leadAt = 0; S.leadState = null; S.leadView = null;
  history.replaceState(null, "", location.pathname + location.search);
  showLogin(msg);
}
function makeGH(sess) {
  const gh = new C.GitHub({ ...sess, branch: BRANCH_OVERRIDE || sess.branch });
  gh.onAuthError = () => setTimeout(() => logout("Oturumunuzun süresi doldu. Lütfen yeniden giriş yapın."), 0);
  return gh;
}

// ---------------------------------------------------------------- giriş ekranı
async function showLogin(message) {
  document.title = "Giriş · VOX Panel";
  const app = $("#app"); app.className = "";
  const msg = h("p", { class: "login-msg", role: "alert", "aria-live": "assertive" });
  const email = h("input", { id: "em", type: "email", name: "email", autocomplete: "username", inputmode: "email", autocapitalize: "off", spellcheck: "false", required: true });
  const pass = h("input", { id: "pw", type: "password", name: "password", autocomplete: "current-password", required: true });
  const show = h("button", { type: "button", class: "pw-toggle", "aria-label": "Şifreyi göster", "aria-pressed": "false",
    onclick: () => { const on = pass.type === "password"; pass.type = on ? "text" : "password"; show.setAttribute("aria-pressed", String(on)); show.textContent = on ? "Gizle" : "Göster"; } }, "Göster");
  const remember = h("input", { type: "checkbox", id: "rm" });
  const btn = h("button", { class: "btn btn-d btn-block", type: "submit" }, "Giriş yap");
  const setMsg = (t, kind = "err") => { msg.textContent = t || ""; msg.dataset.kind = kind; };
  if (message) setMsg(message, "info");

  let users = null, usersErr = false;
  const usersP = fetch(CFG.users || "users.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((j) => (users = j && typeof j === "object" ? j : []))
    .catch(() => { usersErr = true; setMsg("Panel sunucusuna ulaşılamıyor. İnternet bağlantınızı kontrol edip sayfayı yenileyin."); });

  const form = h("form", { class: "login-form", novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    if (!email.value.trim() || !pass.value) { setMsg("E-posta ve şifrenizi yazın."); (email.value.trim() ? pass : email).focus(); return; }
    btn.disabled = true; btn.textContent = "Giriş yapılıyor…"; setMsg("");
    const t0 = Date.now();
    try {
      await usersP;
      if (usersErr) { setMsg("Panel sunucusuna ulaşılamıyor. İnternet bağlantınızı kontrol edip sayfayı yenileyin."); return; }
      const fail = async () => {
        await new Promise((r) => setTimeout(r, Math.max(0, 700 - (Date.now() - t0))));
        const f = C.parseUsersFile(users);
        setMsg(f.users.length || f.legacy.length ? "E-posta veya şifre hatalı." : "Henüz panel kullanıcısı tanımlanmamış."); pass.select();
      };
      const res = await C.login(users, email.value, pass.value);
      if (!res) return fail();
      const gh = makeGH(res); gh.onAuthError = null;
      try { await gh.verify(); } catch (err) {
        setMsg(err.status === 401 ? "Giriş anahtarınızın süresi dolmuş. Yöneticiden yeni anahtar isteyin." : err.status === 404 ? "Site dosyalarına erişim yok. Yöneticiye haber verin." : "GitHub'a ulaşılamıyor. İnternet bağlantınızı kontrol edin.");
        return;
      }
      let sess;
      try { sess = await reconcileLogin(gh, users, res, pass.value); }
      catch (err) { if (err.code === "denied") return fail(); if (err.status === 401) return setMsg("Giriş anahtarınızın süresi dolmuş. Yöneticiden yeni anahtar isteyin."); sess = res; }
      sess = saveSession(sess, remember.checked); pass.value = "";
      if (sess.mustChange) showForceChange(sess); else startApp(sess);
    } finally { btn.disabled = false; btn.textContent = "Giriş yap"; }
  } },
    h("div", { class: "f" }, h("label", { for: "em" }, "E-posta"), email),
    h("div", { class: "f" }, h("label", { for: "pw" }, "Şifre"), h("div", { class: "pw" }, pass, show)),
    h("label", { class: "check", for: "rm" }, remember, h("span", {}, "Beni hatırla"), h("small", {}, "Yalnız kendi telefonunuzda işaretleyin")),
    btn, msg);

  app.replaceChildren(h("main", { class: "login" },
    h("div", { class: "login-card" },
      h("img", { class: "login-logo", src: "/assets/logo/logo-full.svg", alt: "VOX Mimarlık", width: 132, height: 132 }),
      h("div", { class: "eyebrow login-eb" }, "Panel"),
      h("h1", { class: "sr-only" }, "VOX Panel girişi"),
      form,
      BRANCH_OVERRIDE ? h("p", { class: "test-note" }, `Test modu · dal: ${BRANCH_OVERRIDE}`) : null),
    h("a", { class: "login-foot", href: LIVE, target: "_blank", rel: "noopener" }, "voxmimarlik.github.io")));
  setTimeout(() => email.focus(), 50);
}

/**
 * Girişten sonra depodaki (yetkili) kullanıcı dosyasıyla karşılaştır:
 *  - v1 dosya: bu kişiyi yönetici yaparak dosyayı sessizce v2'ye çevir (diğer v1 kayıtları 'legacy' kalır)
 *  - v2: depodaki kayıtla yeniden doğrula (kaldırılan / şifresi sıfırlanan kişi, yayın gecikmesinde de giremez)
 */
async function reconcileLogin(gh, deployed, res, password) {
  const denied = () => { throw new C.PanelError("", 0, "denied"); };
  const { json, sha } = await gh.readUsers();
  if (!json) return res;
  const f = C.parseUsersFile(json);
  const em = res.email;
  const same = (x) => String(x.email || "").toLowerCase() === em;
  if (f.v === 1) {
    if (!f.legacy.some(same)) denied();
    try {
      const m = await C.migrateV1(json, em, password, { token: res.token, repo: res.repo, branch: res.branch });
      const w = await gh.writeUsers(C.serializeUsersFile(m.file), sha, "Panel: kullanıcı dosyası güncellendi");
      S.migratedCommit = w.commit;
      return { ...res, v: 2, role: "yonetici", k: m.k, legacy: false, mustChange: false };
    } catch (e) {
      if (e.status === 401) throw e;
      if (e.code === "denied") denied();
      console.warn("Kullanıcı dosyası yeni biçime geçirilemedi:", e);
      return { ...res, role: "yonetici", legacy: true, k: null }; // bir sonraki girişte yeniden denenir
    }
  }
  if (JSON.stringify(json) === JSON.stringify(deployed)) return res; // yayındaki dosya güncel
  const u = f.users.find(same);
  if (u) {
    const r2 = await C.login(json, em, password);
    if (r2) return r2;
    // yayın gecikmesi: kişi kendi şifresini yeni değiştirdi (aynı anahtar çifti) → eski şifre birkaç dakika daha geçerli
    const d = C.parseUsersFile(deployed).users.find(same);
    if (res.v === 2 && d && d.pub === u.pub) return { ...res, role: u.role === "yonetici" ? "yonetici" : "editor", mustChange: !!u.mustChange, k: JSON.stringify(d.wrap) === JSON.stringify(u.wrap) ? res.k : null };
    denied();
  }
  if (f.legacy.some(same)) return { ...res, role: "editor", legacy: true, k: null };
  denied();
}

/** İlk girişte (geçici şifre) — başka hiçbir şeyden önce şifre değiştirme ekranı */
function showForceChange(sess) {
  document.title = "Şifrenizi belirleyin · VOX Panel";
  stopPoll();
  const app = $("#app"); app.className = "";
  app.replaceChildren(h("main", { class: "login" },
    h("div", { class: "login-card login-card-w" },
      h("img", { class: "login-logo", src: "/assets/logo/logo-full.svg", alt: "VOX Mimarlık", width: 132, height: 132 }),
      h("div", { class: "eyebrow login-eb" }, "Panel"),
      h("h1", { class: "force-t" }, "Kendi şifrenizi belirleyin"),
      h("p", { class: "force-s" }, `Hoş geldiniz${sess.name ? ", " + sess.name.split(" ")[0] : ""}. Size verilen geçici şifreyi değiştirmeden devam edemezsiniz. Yeni şifreyi yalnız siz bilin.`),
      passwordForm({ sess, forced: true, onDone: (s2) => { startApp(s2); toast("Şifreniz kaydedildi. Hoş geldiniz!", "ok"); } }),
      h("button", { type: "button", class: "btn btn-t force-out", onclick: () => logout("Çıkış yaptınız.") }, "Çıkış"),
      BRANCH_OVERRIDE ? h("p", { class: "test-note" }, `Test modu · dal: ${BRANCH_OVERRIDE}`) : null),
    h("div", { class: "toasts", id: "toasts", role: "status", "aria-live": "polite" })));
  setTimeout(() => $("#app input")?.focus(), 50);
}

// ---------------------------------------------------------------- uygulama kabuğu
const SECTIONS = [["ozet", "Özet"], ["talepler", "Talepler"], ["musteriler", "Müşteriler"], ["projeler", "Projeler"], ["blog", "Blog"], ["sss", "SSS"], ["hizmetler", "Hizmetler"], ["surec", "Süreç"], ["ayarlar", "Ayarlar"]];
const isAdmin = () => !!S.sess && S.sess.role === "yonetici";
const accTitle = () => (isAdmin() ? "Kullanıcılar" : "Hesabım");
function startApp(sess) {
  S.sess = sess; S.gh = makeGH(sess);
  applySelfVisit();
  const app = $("#app"); app.className = "app";
  const initials = (sess.name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toLocaleUpperCase("tr");
  const closeMenu = () => { menu.hidden = true; ubtn.setAttribute("aria-expanded", "false"); };
  const menu = h("div", { class: "umenu", id: "umenu", hidden: true, role: "menu" },
    h("div", { class: "umenu-name" }, sess.name, h("small", {}, sess.email), h("small", { class: "umenu-role" }, C.ROLES[sess.role] || "")),
    h("a", { href: "#/kullanicilar", role: "menuitem", onclick: closeMenu }, svg(IC.kullanicilar), accTitle()),
    h("a", { href: "#/kullanicilar/sifre", role: "menuitem", onclick: closeMenu }, svg(IC.lock), "Şifremi değiştir"),
    selfVisitToggle("umenu-tg"),
    h("a", { href: LIVE, target: "_blank", rel: "noopener", role: "menuitem" }, svg(IC.ext), "Siteyi gör"),
    h("button", { type: "button", role: "menuitem", onclick: () => askLogout() }, svg(IC.out), "Çıkış"));
  const ubtn = h("button", { class: "ubtn", type: "button", "aria-haspopup": "menu", "aria-expanded": "false", "aria-controls": "umenu", "aria-label": "Hesap menüsü",
    onclick: (e) => { e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; ubtn.setAttribute("aria-expanded", String(open)); } }, initials);
  document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target)) { menu.hidden = true; ubtn.setAttribute("aria-expanded", "false"); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { menu.hidden = true; ubtn.focus(); } });

  const MOB_MORE = ["blog", "sss", "hizmetler", "surec", "ayarlar"];   // telefonda alt çubuk yerine "Diğer" menüsünde
  const moreBox = h("div", { class: "mob-more-box", hidden: true, role: "menu", "aria-label": "Diğer bölümler" },
    SECTIONS.filter(([k]) => MOB_MORE.includes(k)).map(([k, t]) => h("a", { href: `#/${k}`, role: "menuitem", onclick: () => { moreBox.hidden = true; } }, svg(IC[k]), t)),
    h("a", { href: "#/kullanicilar", role: "menuitem", onclick: () => { moreBox.hidden = true; } }, svg(IC.kullanicilar), accTitle()));
  document.addEventListener("click", (e) => { if (!moreBox.hidden && !moreBox.contains(e.target)) moreBox.hidden = true; });
  const nav = h("nav", { class: "side", "aria-label": "Bölümler" },
    h("div", { class: "side-head" }, h("span", { class: "eyebrow" }, "İçerik")),
    SECTIONS.map(([k, t]) => h("a", { href: `#/${k}`, "data-sec": k, class: MOB_MORE.includes(k) ? "mob-more" : null, onclick: () => { moreBox.hidden = true; } }, svg(IC[k]), k === "talepler" ? h("b", { class: "nbadge", hidden: true, "aria-hidden": "true" }) : null, h("span", {}, t))),
    h("button", { type: "button", class: "mob-more-btn", "aria-haspopup": "true", "aria-expanded": "false", onclick: (e) => { e.stopPropagation(); moreBox.hidden = !moreBox.hidden; e.currentTarget.setAttribute("aria-expanded", String(!moreBox.hidden)); } }, svg(IC.more), h("span", {}, "Diğer")),
    h("div", { class: "side-head side-acc-h" }, h("span", { class: "eyebrow" }, "Hesap")),
    h("a", { href: "#/kullanicilar", "data-sec": "kullanicilar", class: "side-acc" }, svg(IC.kullanicilar), h("span", {}, accTitle())));
  app.replaceChildren(
    BRANCH_OVERRIDE ? h("div", { class: "testbar" }, `Test modu · “${BRANCH_OVERRIDE}” dalı · siteye yansımaz`) : "",
    h("header", { class: "top" },
      h("a", { class: "brand", href: "#/ozet", "aria-label": "VOX Panel ana sayfa" }, h("span", { class: "mark", "aria-hidden": "true" }), h("span", { class: "brand-t" }, "Panel")),
      h("div", { class: "top-title", id: "topTitle" }),
      h("div", { class: "top-r" },
        h("button", { class: "pill", id: "pill", type: "button", hidden: true, "aria-live": "polite", onclick: () => checkStatus(true) }),
        h("a", { class: "who", href: "#/kullanicilar/sifre", title: "Hesabım ve şifre" }, sess.name),
        h("a", { class: "toplink", href: LIVE, target: "_blank", rel: "noopener" }, "Siteyi gör", svg(IC.ext)),
        h("button", { class: "toplink", type: "button", onclick: () => askLogout() }, "Çıkış"),
        h("div", { class: "uwrap" }, ubtn, menu))),
    nav, moreBox,
    h("main", { class: "view", id: "view", tabindex: "-1" }),
    h("div", { class: "toasts", id: "toasts", role: "status", "aria-live": "polite" }));
  if (!location.hash || location.hash === "#") history.replaceState(null, "", "#/ozet");
  route();
  if (sess.talepler) startLeadPoll(); else syncSessTalepler().then((ok) => { if (ok && S.sess === sess) startLeadPoll(); });
  if (S.migratedCommit) { startPoll(S.migratedCommit); S.migratedCommit = null; } else checkStatus(false);
}
async function askLogout() {
  if (S.dirty && !(await confirmDialog("Kaydedilmemiş değişiklikler var. Yine de çıkılsın mı?", "Çık", true))) return;
  logout("Çıkış yaptınız.");
}

// ---------------------------------------------------------------- yönlendirme
window.addEventListener("hashchange", async () => {
  if (!S.gh) return;
  if (S.dirty && location.hash !== S.curHash) {
    const target = location.hash;
    history.replaceState(null, "", S.curHash);
    if (!(await confirmDialog("Kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?", "Kaydetmeden çık", true))) return;
    setDirty(false); location.hash = target; return;
  }
  route();
});
window.addEventListener("beforeunload", (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const sec = parts[0] === "kullanicilar" || SECTIONS.some(([k]) => k === parts[0]) ? parts[0] : "projeler";
  if (sec !== "talepler") S.leadView = null;
  S.curHash = location.hash; setDirty(false);
  document.querySelectorAll(".side a").forEach((a) => { if (a.dataset.sec === sec) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  const title = sec === "kullanicilar" ? accTitle() : SECTIONS.find(([k]) => k === sec)[1];
  $("#topTitle").textContent = title; document.title = `${title} · VOX Panel`;
  // her geçişte yeni kap: geç biten eski yüklemeler ekrana yazamaz
  const old = $("#view"); const view = h("main", { class: "view", id: "view", tabindex: "-1" }); old.replaceWith(view); window.scrollTo(0, 0);
  const go = {
    projeler: () => (parts[1] ? editProject(parts[1]) : listProjects()),
    blog: () => (parts[1] ? editPost(parts[1]) : listPosts()),
    ozet: ozetPage,
    talepler: () => leadsPage(parts[1] || ""),
    musteriler: () => musterilerPage(portalCtx(), parts),
    sss: editSSS, hizmetler: editHizmetler, surec: editSurec, ayarlar: editAyarlar,
    kullanicilar: () => usersPage(parts[1] || ""),
  }[sec];
  Promise.resolve(go()).catch((e) => showError(view, e));
}
/** Müşteriler modülüne verilen ortak yardımcılar */
function portalCtx() {
  return { h, $, svg, IC, S, C, LIVE, LOCAL, field, segmented, toggle, section, listEditor, stringList, saveBar, setDirty, dirty, modal, confirmDialog, alertDialog, promptDialog,
    toast, busy, pageHead, skeletonForm, badge, resizeImage, blobToB64, isAdmin, syncSessTalepler, route };
}
function showError(view, e) {
  if (e && e.status === 401) return;
  view.replaceChildren(h("div", { class: "empty" }, h("p", { class: "eyebrow" }, "Bir sorun oluştu"), h("p", {}, e?.message || String(e)),
    h("button", { class: "btn btn-o", onclick: () => route() }, "Tekrar dene")));
}

// ---------------------------------------------------------------- kirli / kaydet çubuğu
function setDirty(v) {
  S.dirty = v;
  const bar = $(".savebar"); if (!bar) return;
  bar.classList.toggle("is-dirty", v);
  const st = $(".savebar-st", bar); if (st) st.textContent = v ? "Kaydedilmemiş değişiklik var" : "Tüm değişiklikler kaydedildi";
}
const dirty = () => setDirty(true);
function saveBar({ onSave, onDelete, deleteLabel = "Sil" }) {
  const save = h("button", { class: "btn btn-d", type: "button" }, "Kaydet");
  save.addEventListener("click", async () => {
    if (save.disabled) return;
    save.disabled = true; const old = save.textContent; save.textContent = "Kaydediliyor…";
    try { await onSave(); } finally { save.disabled = false; save.textContent = old; }
  });
  return h("div", { class: "savebar" },
    h("span", { class: "savebar-st" }, "Değişiklik yok"),
    h("div", { class: "savebar-b" },
      onDelete ? h("button", { class: "btn btn-x", type: "button", onclick: onDelete }, deleteLabel) : null, save));
}
async function runSave(fn) {
  try {
    const res = await fn();
    setDirty(false);
    toast("Kaydedildi. Site 1–2 dakika içinde güncellenecek.", "ok");
    if (res && res.commit) startPoll(res.commit);
    return res;
  } catch (e) {
    if (e.code === "conflict") await alertDialog("Bu içerik başka bir yerden değişti, sayfayı yenileyin.", "Sayfayı yenile").then(() => route());
    else if (e.code === "exists") toast(e.message, "err");
    else if (e.status !== 401) toast(e.message || "Kaydedilemedi.", "err");
    throw e;
  }
}
const msgOf = (what, title) => `Panel (${S.sess.name}): ${what}${title ? " – " + title : ""}`;

// ---------------------------------------------------------------- yayın durumu
function setPill(text, kind) {
  const p = $("#pill"); if (!p) return;
  p.hidden = !text; p.textContent = text || ""; p.dataset.kind = kind || "";
  p.setAttribute("aria-label", text ? `Yayın durumu: ${text}` : "");
}
function stopPoll() { clearInterval(S.poll); S.poll = null; }
function startPoll(sha) {
  S.pollSha = sha; S.pollAt = Date.now(); setPill("Yayınlanıyor…", "busy");
  stopPoll(); S.poll = setInterval(() => checkStatus(false), 15000);
  setTimeout(() => checkStatus(false), 6000);
}
async function checkStatus(manual) {
  if (!S.gh) return;
  let runs;
  try { runs = await S.gh.status(); } catch { if (manual) toast("Yayın durumu alınamadı.", "err"); return; }
  if (!runs.length) {
    if (BRANCH_OVERRIDE && S.pollSha) { setPill("Test dalı · yayın yok", "test"); stopPoll(); }
    return;
  }
  let run = runs[0];
  if (S.pollSha) {
    const mine = runs.find((r) => r.head_sha === S.pollSha);
    const newer = runs[0] && Date.parse(runs[0].created_at) >= S.pollAt - 5000 ? runs[0] : null;
    run = mine && mine.label !== "Yayınlanıyor…" || !newer ? mine : newer;
    if (!run) { if (Date.now() - S.pollAt > 10 * 60e3) { setPill("", ""); stopPoll(); } return; }
  }
  const lab = run.label;
  if (lab === "Yayınlanıyor…") { setPill("Yayınlanıyor…", "busy"); if (!S.poll) S.poll = setInterval(() => checkStatus(false), 15000); }
  else if (lab === "Yayında") { setPill(S.pollSha || manual ? "Yayında ✓" : "", "ok"); stopPoll(); if (S.pollSha) { S.pollSha = null; toast("Değişiklikler sitede yayında.", "ok"); } }
  else { setPill("Yayın hatası", "err"); stopPoll(); S.pollSha = null; }
}

// ---------------------------------------------------------------- bildirim ve iletişim kutuları
function toast(text, kind = "") {
  const box = $("#toasts"); if (!box) return;
  const t = h("div", { class: `toast ${kind}` }, text);
  box.append(t); setTimeout(() => t.classList.add("in"), 10);
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, kind === "err" ? 7000 : 4500);
}
function modal(build) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const close = (v) => { wrap.remove(); document.body.classList.remove("modal-open"); prev && prev.focus && prev.focus(); resolve(v); };
    const card = h("div", { class: "modal", role: "dialog", "aria-modal": "true" });
    const wrap = h("div", { class: "modal-bg", onclick: (e) => { if (e.target === wrap) close(null); } }, card);
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(null); }
      if (e.key === "Tab") { const f = [...card.querySelectorAll("button,input,select,textarea,a[href]")].filter((x) => !x.disabled); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); } }
    });
    build(card, close);
    document.body.append(wrap); document.body.classList.add("modal-open");
    setTimeout(() => (card.querySelector("[autofocus]") || card.querySelector("input,button"))?.focus(), 20);
  });
}
function confirmDialog(text, ok = "Tamam", danger = false) {
  return modal((card, close) => card.append(
    h("p", { class: "modal-t" }, text),
    h("div", { class: "modal-b" }, h("button", { class: "btn btn-o", type: "button", onclick: () => close(false) }, "Vazgeç"),
      h("button", { class: `btn ${danger ? "btn-xd" : "btn-d"}`, type: "button", autofocus: true, onclick: () => close(true) }, ok)))).then(Boolean);
}
function alertDialog(text, ok = "Tamam") {
  return modal((card, close) => card.append(h("p", { class: "modal-t" }, text),
    h("div", { class: "modal-b" }, h("button", { class: "btn btn-d", type: "button", autofocus: true, onclick: () => close(true) }, ok))));
}
function promptDialog(title, fields) { // fields: [{name,label,value,type,placeholder}]
  return modal((card, close) => {
    const ins = {};
    const form = h("form", { onsubmit: (e) => { e.preventDefault(); close(Object.fromEntries(Object.entries(ins).map(([k, i]) => [k, i.value.trim()]))); } },
      h("p", { class: "modal-t" }, title),
      fields.map((f, i) => { const id = nid("p"); ins[f.name] = h("input", { id, type: f.type || "text", value: f.value || "", placeholder: f.placeholder || "", autofocus: i === 0, inputmode: f.inputmode });
        return h("div", { class: "f" }, h("label", { for: id }, f.label), ins[f.name], f.help ? h("p", { class: "help" }, f.help) : null); }),
      h("div", { class: "modal-b" }, h("button", { class: "btn btn-o", type: "button", onclick: () => close(null) }, "Vazgeç"), h("button", { class: "btn btn-d", type: "submit" }, "Ekle")));
    card.append(form);
  });
}

// ---------------------------------------------------------------- form alanları
function autoGrow(t) { t.style.height = "auto"; t.style.height = Math.max(t.scrollHeight + 2, 0) + "px"; }
function field({ label, help, value, onInput, type = "text", multiline, rows = 3, required, readonly, placeholder, inputmode, autocomplete = "off", maxlength, id }) {
  id = id || nid();
  const hid = help ? id + "h" : null;
  const inp = multiline
    ? h("textarea", { id, rows, required, readOnly: !!readonly, placeholder, "aria-describedby": hid, maxlength })
    : h("input", { id, type, required, readOnly: !!readonly, placeholder, inputmode, autocomplete, "aria-describedby": hid, maxlength });
  inp.value = value ?? "";
  inp.addEventListener("input", () => { if (multiline) autoGrow(inp); onInput && onInput(inp.value, inp); if (onInput) dirty(); });
  if (multiline) requestAnimationFrame(() => autoGrow(inp));
  return h("div", { class: "f" + (readonly ? " ro" : "") }, h("label", { for: id }, label, required ? h("span", { class: "req", "aria-hidden": "true" }, " *") : null), inp,
    help ? h("p", { class: "help", id: hid }, help) : null);
}
function segmented({ label, help, options, value, onChange }) {
  const name = nid("s");
  return h("fieldset", { class: "f seg" }, h("legend", {}, label),
    h("div", { class: "seg-o" }, options.map(([v, t]) => {
      const id = nid();
      return [h("input", { type: "radio", name, id, value: v, checked: v === value, onchange: () => { onChange(v); dirty(); } }), h("label", { for: id }, t)];
    })), help ? h("p", { class: "help" }, help) : null);
}
function toggle({ label, help, checked, onChange }) {
  const id = nid();
  return h("div", { class: "f tg" },
    h("input", { type: "checkbox", role: "switch", id, checked: !!checked, onchange: (e) => { onChange(e.target.checked); dirty(); } }),
    h("label", { for: id }, h("span", { class: "tg-ui", "aria-hidden": "true" }), h("span", { class: "tg-t" }, label, help ? h("small", {}, help) : null)));
}
function section(title, ...kids) { return h("section", { class: "card" }, h("h2", { class: "eyebrow card-h" }, title), kids); }
function ctl(icon, label, onclick, disabled) { return h("button", { type: "button", class: "ctl", "aria-label": label, title: label, disabled, onclick }, svg(IC[icon])); }
function move(arr, i, j) { if (j < 0 || j >= arr.length) return false; const [x] = arr.splice(i, 1); arr.splice(j, 0, x); return true; }

/** Genel liste düzenleyici: sırala (↑↓, masaüstünde sürükle), sil, ekle */
function listEditor({ items, render, create, addLabel, itemTitle, collapsible, confirmRemove, numbered = true, empty = "Henüz öğe yok." }) {
  const box = h("div", { class: "le" });
  const openSet = new WeakSet();
  let dragFrom = -1;
  const draw = (focusIdx) => {
    box.replaceChildren();
    if (!items.length) box.append(h("p", { class: "le-empty" }, empty));
    items.forEach((it, i) => {
      if (it && typeof it === "object" && !collapsible) openSet.add(it);
      const isOpen = !collapsible || (it && typeof it === "object" && openSet.has(it));
      const body = h("div", { class: "le-body", hidden: !isOpen });
      if (isOpen) body.append(render(it, i, (v) => { items[i] = v; }));
      const t = itemTitle ? itemTitle(it, i) : "";
      const head = h("div", { class: "le-head" },
        h("span", { class: "le-drag", title: "Sürükleyerek taşıyın" }, svg(IC.drag)),
        numbered ? h("span", { class: "le-n" }, String(i + 1).padStart(2, "0")) : null,
        collapsible ? h("button", { type: "button", class: "le-t", "aria-expanded": String(isOpen), onclick: () => {
          if (openSet.has(it)) openSet.delete(it); else openSet.add(it); draw(); } }, t || "(adsız)", h("span", { class: "le-car", "aria-hidden": "true" })) : (t ? h("span", { class: "le-t static" }, t) : h("span", { class: "le-sp" })),
        h("span", { class: "le-ctl" },
          ctl("up", "Yukarı taşı", () => { move(items, i, i - 1) && (dirty(), draw(i - 1)); }, i === 0),
          ctl("down", "Aşağı taşı", () => { move(items, i, i + 1) && (dirty(), draw(i + 1)); }, i === items.length - 1),
          ctl("x", "Kaldır", async () => {
            if (confirmRemove && !(await confirmDialog(confirmRemove(it), "Kaldır", true))) return;
            items.splice(i, 1); dirty(); draw();
          })));
      const row = h("div", { class: "le-item" + (isOpen ? " open" : "") }, head, body);
      row.draggable = false;
      const dh = head.querySelector(".le-drag");
      dh.addEventListener("mousedown", () => { row.draggable = true; });
      row.addEventListener("dragstart", (e) => { dragFrom = i; row.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); });
      row.addEventListener("dragend", () => { row.draggable = false; row.classList.remove("dragging"); });
      row.addEventListener("dragover", (e) => { if (dragFrom >= 0) { e.preventDefault(); row.classList.add("over"); } });
      row.addEventListener("dragleave", () => row.classList.remove("over"));
      row.addEventListener("drop", (e) => { e.preventDefault(); row.classList.remove("over"); if (dragFrom >= 0 && dragFrom !== i) { move(items, dragFrom, i); dirty(); draw(i); } dragFrom = -1; });
      box.append(row);
      if (focusIdx === i) setTimeout(() => row.querySelector(".ctl:not([disabled])")?.focus(), 0);
    });
    if (create) box.append(h("button", { type: "button", class: "btn btn-o btn-add", onclick: () => {
      const n = create(); items.push(n); if (n && typeof n === "object") openSet.add(n); dirty(); draw();
      setTimeout(() => box.querySelectorAll(".le-item")[items.length - 1]?.querySelector("input,textarea")?.focus(), 0);
    } }, svg(IC.plus), addLabel || "Ekle"));
  };
  draw();
  return box;
}
/** Metin listesi (paragraf, madde) */
function stringList({ items, label, addLabel, multiline, rows = 3, help, placeholder }) {
  return h("div", { class: "f" }, h("div", { class: "lbl" }, label), help ? h("p", { class: "help" }, help) : null,
    listEditor({ items, addLabel, create: () => "", empty: "Henüz eklenmedi.",
      render: (v, i, set) => {
        const id = nid();
        const inp = multiline ? h("textarea", { id, rows, placeholder, "aria-label": `${label} ${i + 1}` }) : h("input", { id, type: "text", placeholder, "aria-label": `${label} ${i + 1}` });
        inp.value = v; inp.addEventListener("input", () => { set(inp.value); dirty(); if (multiline) autoGrow(inp); });
        if (multiline) requestAnimationFrame(() => autoGrow(inp));
        return inp;
      } }));
}

// ---------------------------------------------------------------- veri
async function pmap(arr, fn, n = 6) { const out = new Array(arr.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, arr.length) }, async () => { while (i < arr.length) { const k = i++; out[k] = await fn(arr[k], k); } })); return out; }
async function loadProjects(force) {
  if (S.projects && !force) return S.projects;
  const files = (await S.gh.list("content/projeler")).filter((f) => f.name.endsWith(".json"));
  const out = await pmap(files, async (f) => { const r = await S.gh.read(f.path); return { path: f.path, sha: r.sha, slug: f.name.slice(0, -5), data: JSON.parse(r.content) }; });
  out.sort((a, b) => (a.data.sira ?? 9999) - (b.data.sira ?? 9999) || String(a.data.title).localeCompare(String(b.data.title), "tr"));
  return (S.projects = out);
}
async function loadManifest() {
  if (S.manifest) return S.manifest;
  try { S.manifest = JSON.parse((await S.gh.read("src/img/manifest.json")).content); } catch { S.manifest = {}; }
  return S.manifest;
}
async function loadTaken() {
  if (!S.taken) S.taken = new Set((await S.gh.list("src/uploads")).map((f) => f.name));
  return S.taken;
}
async function loadDoc(path) { const r = await S.gh.read(path); return { data: JSON.parse(r.content), sha: r.sha }; }

// ---------------------------------------------------------------- görseller
const upToRepo = (u) => "src/uploads/" + String(u).replace(/^\/?(src\/)?uploads\//, "");
const isUpload = (u) => /^\/?(src\/)?uploads\//.test(String(u || ""));
async function imgSrc(u) {
  if (!u) return "";
  if (/^(https?:|data:|blob:)/.test(u)) return u;
  if (isUpload(u)) {
    const rp = upToRepo(u);
    if (S.pending.has(rp)) return S.pending.get(rp).url;
    if (!S.urls.has(rp)) S.urls.set(rp, S.gh.readBlobUrl(rp).catch(() => ""));
    return S.urls.get(rp);
  }
  return LIVE + (u.startsWith("/") ? u : "/" + u);
}
/** <img> — önce hızlı adres (canlı site küçük görseli), olmazsa yedek (özel depodan) */
function pic(first, fallback, alt = "", cls = "") {
  const im = h("img", { alt, class: cls, loading: "lazy", decoding: "async" });
  const wrap = h("span", { class: "pic is-loading" }, im);
  let triedFb = false;
  const fail = async () => {
    if (!triedFb && fallback) { triedFb = true; const s = await imgSrc(fallback); if (s) { im.src = s; return; } }
    wrap.classList.remove("is-loading"); wrap.classList.add("is-empty");
  };
  im.addEventListener("load", () => wrap.classList.remove("is-loading"));
  im.addEventListener("error", fail);
  Promise.resolve(first ? (isUpload(first) ? imgSrc(first) : first) : "").then((s) => (s ? (im.src = s) : fail()));
  return wrap;
}
function projectPhotos(d, slug) { // build.py ile aynı numaralama
  if ((d.galeri && d.galeri.length) || d.kapak) {
    const srcs = [...(d.galeri || [])]; if (d.kapak && !srcs.includes(d.kapak)) srcs.unshift(d.kapak);
    return srcs.map((u, i) => { const nn = String(i + 1).padStart(2, "0"); return { nn, src: u, thumb: `${LIVE}/img/${slug}/${nn}-s.jpg` }; });
  }
  const dir = d.img || slug; const m = S.manifest && S.manifest[dir];
  return (m ? m.items : []).map((it) => ({ nn: it.f, src: null, thumb: `${LIVE}/img/${dir}/${it.f}-s.jpg` }));
}
function projectThumb(p) {
  const d = p.data;
  if (d.kapak || (d.galeri && d.galeri.length)) {
    const ph = projectPhotos(d, p.slug); const c = ph.find((x) => x.src === d.kapak) || ph[0];
    return d.taslak ? pic(c.src, null, "") : pic(c.thumb, c.src, "");
  }
  return pic(`${LIVE}/img/${d.img || p.slug}/${d.cover || "01"}-s.jpg`, null, "");
}

/** Fotoğrafı telefonda küçült: en uzun kenar 2400px, JPEG %85, EXIF yönü korunur */
async function resizeImage(file, max = 2400, q = 0.85) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch {
    src = await new Promise((res, rej) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("Bu fotoğraf açılamadı. JPEG veya PNG seçin.")); im.src = u; });
  }
  const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
  const k = Math.min(1, max / Math.max(w0, h0));
  const w = Math.round(w0 * k), hh = Math.round(h0 * k);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
  const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, hh); ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, hh); src.close && src.close();
  const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", q));
  if (!blob) throw new Error("Fotoğraf hazırlanamadı.");
  return blob;
}
const blobToB64 = (b) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = rej; fr.readAsDataURL(b); });
function pickFiles(multiple) {
  return new Promise((resolve) => {
    const inp = h("input", { type: "file", accept: "image/*", multiple, style: { position: "fixed", left: "-9999px" } });
    inp.addEventListener("change", () => { resolve([...inp.files]); inp.remove(); });
    inp.addEventListener("cancel", () => { resolve([]); inp.remove(); });
    document.body.append(inp); inp.click();
  });
}
/** Seç -> küçült -> GitHub'a gönder (henüz yayına girmez; Kaydet'te tek seferde eklenir). /uploads/… yolları döner */
async function uploadPhotos(files, progressEl) {
  const taken = await loadTaken();
  const out = [];
  const bar = h("div", { class: "prog-bar" }, h("span"));
  const txt = h("span", { class: "prog-t" });
  progressEl.replaceChildren(txt, bar); progressEl.hidden = false;
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const step = (s, frac) => { txt.textContent = `Fotoğraf ${i + 1} / ${files.length} · ${s}`; bar.firstChild.style.width = `${Math.round(((i + frac) / files.length) * 100)}%`; };
      step("hazırlanıyor…", 0.1);
      try {
        const blob = await resizeImage(f);
        if (blob.size > C.MAX_UPLOAD) throw new Error("Fotoğraf çok büyük (en fazla 8 MB).");
        step("yükleniyor…", 0.45);
        const sha = await S.gh.createBlob(await blobToB64(blob));
        const name = C.uploadName(f.name, taken);
        S.pending.set("src/uploads/" + name, { blobSha: sha, url: URL.createObjectURL(blob) });
        out.push("/uploads/" + name);
        step("tamam", 1);
      } catch (e) { if (e.status === 401) throw e; toast(`${f.name}: ${e.message}`, "err"); }
    }
  } finally { setTimeout(() => { progressEl.hidden = true; }, 600); }
  return out;
}
/** Kaydederken içerikte geçen bekleyen fotoğraflar */
function pendingChanges(text) {
  const ch = [];
  for (const [path, v] of S.pending) if (text.includes(path.replace(/^src/, ""))) ch.push({ path, blobSha: v.blobSha });
  return ch;
}
function afterCommit(changes) {
  for (const c of changes) if (S.pending.has(c.path)) { const v = S.pending.get(c.path); S.urls.set(c.path, Promise.resolve(v.url)); S.pending.delete(c.path); }
}

/** Tek görsel alanı (kapak) */
function imageField({ label, help, get, set, aspect = "4/3", fallback }) {
  const box = h("div", { class: "f imgf" });
  const prog = h("div", { class: "prog", hidden: true });
  const draw = () => {
    const v = get();
    box.replaceChildren(h("div", { class: "lbl" }, label), help ? h("p", { class: "help" }, help) : null,
      h("div", { class: "imgf-row" },
        h("div", { class: "imgf-pv", style: { aspectRatio: aspect } }, v ? pic(isUpload(v) ? v : LIVE + v, v, label)
          : fallback && fallback() ? [pic(fallback(), null, label), h("span", { class: "imgf-auto" }, "Otomatik: galerinin ilk fotoğrafı")]
          : h("span", { class: "imgf-ph" }, svg(IC.img), "Fotoğraf yok")),
        h("div", { class: "imgf-b" },
          h("button", { type: "button", class: "btn btn-o", onclick: async () => {
            const files = await pickFiles(false); if (!files.length) return;
            const [u] = await uploadPhotos(files, prog); if (u) { set(u); dirty(); draw(); }
          } }, v ? "Değiştir" : "Fotoğraf seç"),
          v ? h("button", { type: "button", class: "btn btn-t", onclick: () => { set(""); dirty(); draw(); } }, "Kaldır") : null)),
      prog);
  };
  draw();
  return box;
}


// ================================================================= ÖZET (ziyaret istatistiği)
/** Bu cihazdaki ziyaretler sayılmasın: site.js localStorage 'vox_ben' görünce sayım göndermez. */
const selfVisitOn = () => { try { return localStorage.getItem("vox_ben_kapali") !== "1"; } catch { return true; } };
function applySelfVisit() { try { if (selfVisitOn()) localStorage.setItem("vox_ben", "1"); else localStorage.removeItem("vox_ben"); } catch {} }
function selfVisitToggle(cls) {
  const cb = h("input", { type: "checkbox", checked: selfVisitOn(), onchange: () => {
    try { localStorage.setItem("vox_ben_kapali", cb.checked ? "0" : "1"); } catch {}
    applySelfVisit();
    document.querySelectorAll(".selfv input").forEach((x) => { x.checked = cb.checked; });
    toast(cb.checked ? "Bu cihazdaki ziyaretleriniz sayılmayacak." : "Bu cihazdaki ziyaretleriniz de sayılacak.", "ok");
  } });
  return h("label", { class: `selfv ${cls || ""}` }, cb, h("span", {}, "Bu cihazdaki ziyaretlerimi sayma"));
}
const nf = (n) => Number(n || 0).toLocaleString("tr-TR");
async function ozetPage() {
  const view = $("#view");
  const refresh = h("button", { class: "btn btn-o btn-sm", type: "button", onclick: () => route() }, svg(IC.refresh), "Yenile");
  view.replaceChildren(pageHead({ eyebrow: "Site", title: "Özet" }), skeletonForm());
  await syncSessTalepler();
  if (!S.sess.talepler) return leadsSetup(view, false);
  let st, titles = {};
  try {
    [st] = await Promise.all([leadsClient().stats(30),
      loadProjects().then((ps) => { for (const p of ps) titles[p.slug] = p.data.title; }).catch(() => {})]);
  } catch (e) {
    if (e && e.status === 401) return;
    const msg = e && e.code === "auth" ? (isAdmin() ? "Talepler anahtarı geçersiz. Talepler bağlantısını yeniden kurun." : "Yöneticiye haber verin; Talepler kurulumunu yenilemesi gerekiyor.")
      : e && e.code === "action" ? "Site bağlantısı (Apps Script) eski sürümde. Yöneticinin web uygulamasını güncellemesi gerekiyor." : (e && e.message) || "Özet alınamadı.";
    view.replaceChildren(pageHead({ eyebrow: "Site", title: "Özet", action: refresh }), h("div", { class: "note warn" }, h("p", {}, msg)));
    return;
  }
  const T = st.totals || {}, days = st.days || [];
  const card = (label, t) => h("div", { class: "ocard" }, h("div", { class: "eyebrow" }, label),
    h("div", { class: "ocard-n" }, nf(t && t.visits), h("small", {}, " ziyaret")), h("div", { class: "ocard-s" }, `${nf(t && t.visitors)} ziyaretçi`));
  const nNew = Number(st.leadsNew || 0);
  const leadCard = h("a", { class: `ocard olead${nNew ? " has" : ""}`, href: "#/talepler" }, svg(IC.talepler),
    h("div", {}, h("div", { class: "ocard-l" }, "Yeni talepler: ", h("strong", {}, nf(nNew))), h("div", { class: "ocard-s" }, nNew ? "Aramayı bekleyen talepleri görün →" : "Bekleyen yeni talep yok · Taleplere git →")));
  const cards = h("div", { class: "ostats" }, card("Bugün", T.today), card("Son 7 gün", T.week), card("Son 30 gün", T.month));
  const note = h("p", { class: "help ofoot" }, "Sayfa açılışları sayılır; çerez ve kişisel veri kullanılmaz. Ziyaretçi = o gün siteye ilk kez giren cihaz. Rakamlar en fazla 5 dakikada bir yenilenir.");
  const own = h("div", { class: "ofoot" }, selfVisitToggle());
  const total = (T.month && T.month.visits) || 0;
  if (!total) {
    view.replaceChildren(pageHead({ eyebrow: "Site", title: "Özet", sub: "Son 30 gün", action: refresh }), leadCard, cards,
      h("div", { class: "empty oempty" }, svg(IC.ozet, "ic empty-ic"), h("p", {}, "Henüz ziyaret verisi yok. Site bağlantısı kurulunca burada görünecek.")), note, own);
    return;
  }
  const max = Math.max(1, ...days.map((d) => d.visits));
  const chart = h("div", { class: "ochart", role: "img", "aria-label": `Son ${days.length} günün ziyaret grafiği; en yüksek ${nf(max)}` },
    days.map((d, i) => h("div", { class: `obar${i === days.length - 1 ? " today" : ""}`, title: `${C.shortDay(d.date)}: ${nf(d.visits)} ziyaret, ${nf(d.visitors)} ziyaretçi` },
      h("i", { style: `height:${d.visits ? Math.max(3, Math.round((d.visits / max) * 100)) : 0}%` }))));
  const axis = h("div", { class: "oaxis" }, h("span", {}, days[0] ? C.shortDay(days[0].date) : ""), h("span", {}, `en yüksek ${nf(max)}`), h("span", {}, "Bugün"));
  const rowBar = (label, val, pct, extra) => h("li", { class: "orow" }, h("div", { class: "orow-t" }, h("span", {}, label), h("b", {}, extra)), h("div", { class: "orow-b" }, h("i", { style: `width:${Math.max(pct, 1)}%` })));
  const pmax = Math.max(1, ...(st.pages || []).map((x) => x.visits));
  const pages = h("ol", { class: "olist" }, (st.pages || []).map((x) => rowBar(C.pathLabel(x.p, titles), x.visits, Math.round((x.visits / pmax) * 100), nf(x.visits))));
  const srcs = h("ul", { class: "olist" }, C.sourceBars(st.sources || []).map((x) => rowBar(x.label, x.visits, x.pct, `%${x.pct}`)));
  const dv = st.devices || {}, dt = (dv.m || 0) + (dv.d || 0) || 1, mp = Math.round(((dv.m || 0) / dt) * 100);
  const dev = h("div", {}, h("div", { class: "osplit", role: "img", "aria-label": `Telefon %${mp}, Bilgisayar %${100 - mp}` }, h("i", { style: `width:${mp}%` })),
    h("div", { class: "osplit-l" }, h("span", {}, h("b", {}, `%${mp}`), " Telefon"), h("span", {}, h("b", {}, `%${100 - mp}`), " Bilgisayar")));
  view.replaceChildren(pageHead({ eyebrow: "Site", title: "Özet", sub: "Siteniz son 30 günde", action: refresh }), leadCard, cards,
    h("div", { class: "ogrid" },
      h("section", { class: "card ochart-c" }, h("h2", { class: "eyebrow card-h" }, "Günlük ziyaret · son 30 gün"), chart, axis),
      section("En çok bakılan sayfalar", pages),
      section("Ziyaretçiler nereden geliyor", srcs),
      section("Cihaz", dev)),
    note, own);
}

// ================================================================= PROJELER
function pageHead({ eyebrow, title, sub, action, back }) {
  return h("div", { class: "vh" },
    back ? h("a", { class: "back", href: back[0] }, svg(IC.back), back[1]) : null,
    h("div", { class: "vh-row" },
      h("div", {}, h("div", { class: "eyebrow" }, eyebrow), h("h1", { class: "vh-t" }, title), sub ? h("p", { class: "vh-s" }, sub) : null),
      action || null));
}
function skeletonGrid(n = 6) { return h("div", { class: "grid", "aria-busy": "true", "aria-label": "Yükleniyor" }, Array.from({ length: n }, () => h("div", { class: "pcard sk" }, h("div", { class: "pcard-ph" }), h("div", { class: "pcard-b" }, h("i"), h("i"))))); }
function skeletonForm() { return h("div", { class: "card sk-form", "aria-busy": "true" }, h("i"), h("i"), h("i", { class: "tall" }), h("i"), h("i")); }
const badge = (t, k = "") => h("span", { class: `badge ${k}` }, t);
const CAT = { konut: "Konut", villa: "Villa", ticari: "Ticari" };

async function listProjects() {
  const view = $("#view");
  const newBtn = h("a", { class: "btn btn-d", href: "#/projeler/yeni" }, svg(IC.plus), "Yeni proje");
  view.replaceChildren(pageHead({ eyebrow: "İçerik", title: "Projeler", action: newBtn }), skeletonGrid());
  const [ps] = await Promise.all([loadProjects(true), loadManifest()]);
  const drafts = ps.filter((p) => p.data.taslak).length;
  view.replaceChildren(pageHead({ eyebrow: "İçerik", title: "Projeler", sub: `${ps.length} proje${drafts ? ` · ${drafts} taslak` : ""} · sitedeki sırayla`, action: newBtn }),
    ps.length ? h("div", { class: "grid" }, ps.map((p) => h("a", { class: "pcard", href: `#/projeler/${encodeURIComponent(p.slug)}` },
      h("div", { class: "pcard-ph" }, projectThumb(p),
        h("div", { class: "pcard-bd" }, badge(p.data.st === "t" ? "Tasarım" : "Uygulama", p.data.st === "t" ? "b-t" : "b-u"), p.data.taslak ? badge("Taslak", "b-d") : null)),
      h("div", { class: "pcard-b" }, h("h3", {}, p.data.title || p.slug),
        h("p", {}, [p.data.loc, CAT[p.data.cat]].filter(Boolean).join(" · ")),
        h("span", { class: "pcard-n" }, `Sıra ${p.data.sira ?? "—"}`)))))
      : h("div", { class: "empty" }, h("p", { class: "eyebrow" }, "Henüz proje yok"), h("p", {}, "İlk projenizi ekleyin."), newBtn.cloneNode(true)));
}

async function editProject(slug) {
  const view = $("#view");
  const isNew = slug === "yeni";
  view.replaceChildren(pageHead({ eyebrow: isNew ? "Yeni proje" : "Proje", title: isNew ? "Yeni proje" : "…", back: ["#/projeler", "Projeler"] }), skeletonForm());
  const [ps] = await Promise.all([loadProjects(), loadManifest(), loadTaken()]);
  let rec = isNew ? null : ps.find((p) => p.slug === slug);
  if (!isNew && !rec) { view.replaceChildren(pageHead({ eyebrow: "Proje", title: "Bulunamadı", back: ["#/projeler", "Projeler"] }), h("div", { class: "empty" }, h("p", {}, "Bu proje bulunamadı. Silinmiş olabilir."))); return; }
  if (rec) { // en güncel hâli
    const r = await S.gh.read(rec.path); rec.sha = r.sha; rec.data = JSON.parse(r.content);
  }
  const maxSira = Math.max(0, ...ps.map((p) => Number(p.data.sira) || 0));
  const d = rec ? rec.data : { sira: Math.ceil((maxSira + 1) / 10) * 10, slug: "", title: "", loc: "", cat: "konut", st: "u", short: "", story: [""], kapak: "", galeri: [], taslak: false };
  const had = new Set(Object.keys(d));
  if (!Array.isArray(d.story)) d.story = d.story ? [String(d.story)] : [];
  const galeri = Array.isArray(d.galeri) ? [...d.galeri] : [];
  let slugTouched = false, curSlug = rec ? rec.slug : "";
  const titleEl = h("h1", { class: "vh-t" }, d.title || "Yeni proje");
  const draftBadge = badge("Taslak", "b-d");
  const syncHead = () => { titleEl.textContent = d.title || (isNew ? "Yeni proje" : "(adsız)"); draftBadge.hidden = !d.taslak; };

  const slugHelp = h("p", { class: "help" });
  const slugInp = field({ label: "Sitedeki adres", value: curSlug, readonly: !isNew, inputmode: "url",
    onInput: (v, el) => { slugTouched = true; const s = C.slugify(v); curSlug = s; slugHelp.textContent = `${LIVE.replace("https://", "")}/projeler/${s || "…"}/`; } });
  slugInp.append(slugHelp);
  const setSlugHelp = () => { slugHelp.textContent = isNew ? `${LIVE.replace("https://", "")}/projeler/${curSlug || "…"}/ — başlıktan otomatik oluşur, isterseniz değiştirebilirsiniz.` : `${LIVE.replace("https://", "")}/projeler/${curSlug}/ — yayındaki projelerin adresi değiştirilemez.`; };
  setSlugHelp();
  if (isNew) $("input", slugInp).addEventListener("blur", (e) => { e.target.value = curSlug; setSlugHelp(); });

  // fotoğraflar
  const galBox = h("div", { class: "gal" });
  const galProg = h("div", { class: "prog", hidden: true });
  const legacy = !rec || d.kapak || galeri.length ? null : projectPhotos(d, rec.slug);
  let dragFrom = -1;
  const drawGal = () => {
    galBox.replaceChildren();
    galeri.forEach((u, i) => {
      const isCover = d.kapak ? d.kapak === u : i === 0;
      const tile = h("div", { class: "gal-t" + (isCover ? " is-cover" : ""), draggable: "true" },
        h("div", { class: "gal-ph" }, pic(u, null, `Galeri fotoğrafı ${i + 1}`), h("span", { class: "gal-n" }, String(i + 1).padStart(2, "0")), isCover ? h("span", { class: "gal-c" }, "Kapak") : null),
        h("div", { class: "gal-b" },
          ctl("up", "Öne al", () => { move(galeri, i, i - 1) && (dirty(), drawGal()); }, i === 0),
          ctl("down", "Sona al", () => { move(galeri, i, i + 1) && (dirty(), drawGal()); }, i === galeri.length - 1),
          ctl("star", "Kapak yap", () => { d.kapak = u; dirty(); drawGal(); drawCover(); }, isCover),
          ctl("x", "Kaldır", () => { galeri.splice(i, 1); if (d.kapak === u) d.kapak = ""; dirty(); drawGal(); drawCover(); })));
      tile.addEventListener("dragstart", (e) => { dragFrom = i; tile.classList.add("dragging"); e.dataTransfer.setData("text/plain", String(i)); });
      tile.addEventListener("dragend", () => tile.classList.remove("dragging"));
      tile.addEventListener("dragover", (e) => { e.preventDefault(); tile.classList.add("over"); });
      tile.addEventListener("dragleave", () => tile.classList.remove("over"));
      tile.addEventListener("drop", (e) => { e.preventDefault(); tile.classList.remove("over"); if (dragFrom >= 0 && dragFrom !== i) { move(galeri, dragFrom, i); dirty(); drawGal(); } dragFrom = -1; });
      galBox.append(tile);
    });
    galBox.append(h("button", { type: "button", class: "gal-add", onclick: async () => {
      const files = await pickFiles(true); if (!files.length) return;
      const us = await uploadPhotos(files, galProg); if (us.length) { galeri.push(...us); dirty(); drawGal(); drawCover(); }
    } }, svg(IC.plus), h("span", {}, "Fotoğraf ekle"), h("small", {}, "Birden çok seçebilirsiniz")));
    if (!d.kapak && typeof drawCover === "function" && coverBox.firstChild) drawCover();
  };
  const coverBox = h("div");
  const drawCover = () => coverBox.replaceChildren(imageField({ label: "Kapak fotoğrafı", help: "Proje kartında ve sayfanın başında görünür. Boş bırakılırsa galerinin ilk fotoğrafı kapak olur.",
    get: () => d.kapak || "", set: (v) => { d.kapak = v; drawGal(); }, fallback: () => galeri[0] || "" }));
  drawCover(); drawGal();

  const editors = h("div", { hidden: !!(legacy && legacy.length) }, coverBox,
    h("div", { class: "f" }, h("div", { class: "lbl" }, "Galeri"), h("p", { class: "help" }, "Telefonunuzdan birden çok fotoğraf seçebilirsiniz; otomatik küçültülür. Sırayı oklarla (bilgisayarda sürükleyerek) değiştirin."), galBox, galProg));
  const photos = section("Fotoğraflar",
    legacy && legacy.length ? h("div", { class: "note" },
      h("p", {}, h("strong", {}, `Bu projenin ${legacy.length} fotoğrafı sitede hazır. `), "Kapak işaretli olandır."),
      h("div", { class: "legacy" }, legacy.slice(0, 12).map((x) => h("div", { class: "legacy-t" + (x.nn === (d.cover || "01") ? " is-cover" : "") }, pic(x.thumb, null, `Foto ${x.nn}`)))),
      legacy.length > 12 ? h("p", { class: "help" }, `+${legacy.length - 12} fotoğraf daha`) : null,
      editors.hidden ? h("button", { type: "button", class: "btn btn-o btn-sm legacy-btn", onclick: async (e) => {
        if (!(await confirmDialog("Yeni fotoğraf eklerseniz sitedeki galeri yalnızca eklediğiniz fotoğraflardan oluşur; mevcut fotoğraflar bu projede görünmez. Devam edilsin mi?", "Devam et"))) return;
        editors.hidden = false; e.target.remove();
      } }, "Yeni fotoğraflarla değiştir") : null) : null,
    editors);

  const save = async () => {
    d.title = (d.title || "").trim();
    if (!d.title) return toast("Proje adını yazın.", "err");
    if (!curSlug) return toast("Sitedeki adresi yazın.", "err");
    if (isNew && ps.some((p) => p.slug === curSlug)) return toast("Bu adreste başka bir proje var. Adresi değiştirin.", "err");
    if (!String(d.short || "").trim()) return toast("Kısa özeti yazın.", "err");
    if (isNew && !d.taslak && !galeri.length && !d.kapak) return toast("Yeni projeye en az bir fotoğraf ekleyin (veya taslak olarak kaydedin).", "err");
    const out = { ...d };
    out.slug = curSlug;
    out.story = d.story.map((s) => s.trim()).filter(Boolean);
    out.galeri = galeri;
    for (const k of ["kapak", "galeri", "taslak", "video", "loc"]) {
      const v = out[k]; const empty = v === "" || v === false || v == null || (Array.isArray(v) && !v.length);
      if (empty && !had.has(k)) delete out[k];
    }
    if (out.sira !== undefined && out.sira !== "") out.sira = Number(out.sira);
    const path = `content/projeler/${curSlug}.json`;
    const text = C.toJSON(out);
    const ch = [{ path, content: text, expectSha: rec ? rec.sha : null }, ...pendingChanges(text)];
    const res = await runSave(() => S.gh.commit(ch, msgOf(isNew ? "Yeni proje" : "Proje güncellendi", out.title))).catch(() => null);
    if (!res) return;
    afterCommit(ch);
    if (rec) { rec.sha = res.shas[path]; rec.data = out; Object.assign(d, out); }
    else { S.projects.push({ path, sha: res.shas[path], slug: curSlug, data: out }); S.projects.sort((a, b) => (a.data.sira ?? 9999) - (b.data.sira ?? 9999)); S.curHash = `#/projeler/${curSlug}`; location.hash = S.curHash; }
  };
  const del = rec ? async () => {
    if (!(await confirmDialog(`“${d.title}” projesi silinsin mi? Sitedeki sayfası da kaldırılır. Bu işlem geri alınamaz.`, "Projeyi sil", true))) return;
    const res = await runSave(() => S.gh.commit([{ path: rec.path, delete: true, expectSha: rec.sha }], msgOf("Proje silindi", d.title))).catch(() => null);
    if (!res) return;
    S.projects = S.projects.filter((p) => p !== rec); toast("Proje silindi.", "ok"); location.hash = "#/projeler";
  } : null;

  view.replaceChildren(
    h("div", { class: "vh" }, h("a", { class: "back", href: "#/projeler" }, svg(IC.back), "Projeler"),
      h("div", { class: "vh-row" }, h("div", {}, h("div", { class: "eyebrow" }, isNew ? "Yeni proje" : "Proje düzenle"), titleEl, h("div", { class: "vh-badges" }, draftBadge)),
        !isNew && !d.taslak ? h("a", { class: "btn btn-o btn-sm", href: `${LIVE}/projeler/${rec.slug}/`, target: "_blank", rel: "noopener" }, "Sitede gör", svg(IC.ext)) : null)),
    h("div", { class: "form" },
      section("Temel bilgiler",
        field({ label: "Proje adı", required: true, value: d.title, help: "Müşteri adı kullanmayın. Örn. Vaditepe 2 Daire",
          onInput: (v) => { d.title = v; syncHead(); if (isNew && !slugTouched) { curSlug = C.slugify(v); $("input", slugInp).value = curSlug; setSlugHelp(); } } }),
        slugInp,
        field({ label: "Konum", value: d.loc, help: "Örn. Beylikdüzü, İstanbul", onInput: (v) => (d.loc = v) }),
        segmented({ label: "Kategori", options: [["konut", "Konut"], ["villa", "Villa"], ["ticari", "Ticari"]], value: d.cat, onChange: (v) => (d.cat = v) }),
        segmented({ label: "Tür", options: [["u", "Uygulama (gerçek fotoğraf)"], ["t", "Tasarım (render)"]], value: d.st, help: "Render'ı Uygulama olarak işaretlemeyin.", onChange: (v) => (d.st = v) }),
        field({ label: "Kısa özet", required: true, multiline: true, rows: 2, value: d.short, help: "Proje kartında ve sayfa başında görünen tek cümle.", onInput: (v) => (d.short = v) })),
      section("Proje hikâyesi", stringList({ items: d.story, label: "Paragraf", addLabel: "Paragraf ekle", multiline: true, rows: 4, help: "Her kutu bir paragraf. Ölçü, süre veya fiyat uydurmayın." })),
      photos,
      section("Yayın",
        field({ label: "Sıra", type: "number", inputmode: "numeric", value: d.sira, help: "Küçük sayı önce gelir (10, 20, 30…).", onInput: (v) => (d.sira = v === "" ? "" : Number(v)) }),
        toggle({ label: "Taslak (yayınlama)", help: "Açıkken proje sitede görünmez.", checked: d.taslak, onChange: (v) => { d.taslak = v; syncHead(); } }),
        had.has("video") || !isNew ? toggle({ label: "Proje filmi var", help: "Yalnız sitede filmi hazır olan projeler için.", checked: d.video, onChange: (v) => (d.video = v) }) : null)),
    saveBar({ onSave: save, onDelete: del, deleteLabel: "Sil" }));
  syncHead();
}

// ================================================================= BLOG
async function loadPosts() {
  const files = (await S.gh.list("content/blog")).filter((f) => f.name.endsWith(".md"));
  const out = await pmap(files, async (f) => { const r = await S.gh.read(f.path); const fm = C.parseFrontmatter(r.content); return { path: f.path, sha: r.sha, slug: f.name.slice(0, -3), meta: fm.meta, body: fm.body }; });
  return out.sort((a, b) => String(C.metaGet(b.meta, "date")).localeCompare(String(C.metaGet(a.meta, "date"))));
}
async function listPosts() {
  const view = $("#view");
  const newBtn = h("a", { class: "btn btn-d", href: "#/blog/yeni" }, svg(IC.plus), "Yeni yazı");
  view.replaceChildren(pageHead({ eyebrow: "İçerik", title: "Blog", action: newBtn }), h("div", { class: "rows", "aria-busy": "true" }, Array.from({ length: 3 }, () => h("div", { class: "row sk" }, h("i"), h("i")))));
  const posts = await loadPosts();
  view.replaceChildren(pageHead({ eyebrow: "İçerik", title: "Blog", sub: posts.length ? `${posts.length} yazı` : "", action: newBtn }),
    posts.length ? h("div", { class: "rows" }, posts.map((p) => {
      const draft = C.metaGet(p.meta, "draft", false) === true; const cover = C.metaGet(p.meta, "cover");
      return h("a", { class: "row", href: `#/blog/${encodeURIComponent(p.slug)}` },
        h("div", { class: "row-ph" }, cover ? pic(isUpload(cover) ? cover : LIVE + cover, cover, "") : h("span", { class: "imgf-ph" }, svg(IC.blog))),
        h("div", { class: "row-b" }, h("div", { class: "row-m" }, h("span", { class: "eyebrow" }, C.trDate(C.metaGet(p.meta, "date"))), badge(draft ? "Taslak" : "Yayında", draft ? "b-d" : "b-ok")),
          h("h3", {}, C.metaGet(p.meta, "title") || p.slug), h("p", {}, C.metaGet(p.meta, "summary"))));
    })) : h("div", { class: "empty" }, h("p", { class: "eyebrow" }, "Henüz yazı yok"), h("p", {}, "İlk blog yazınızı ekleyin."), newBtn.cloneNode(true)));
}
const TOOLS = [
  ["Başlık", "h2"], ["Alt başlık", "h3"], ["Kalın", "b"], ["İtalik", "i"], ["Bağlantı", "a"], ["Liste", "ul"], ["Alıntı", "q"], ["Görsel ekle", "img"],
];
function mdToolbar(ta, onImage) {
  const lineOp = (prefix) => {
    const v = ta.value; let s = ta.selectionStart, e = ta.selectionEnd;
    const ls = v.lastIndexOf("\n", s - 1) + 1; let le = v.indexOf("\n", e); if (le < 0) le = v.length;
    const lines = v.slice(ls, le).split("\n").map((l) => { const clean = l.replace(/^(#{1,4}\s+|>\s?|[-*+]\s+)/, ""); return l.startsWith(prefix) ? clean : prefix + clean; });
    const rep = lines.join("\n"); ta.setRangeText(rep, ls, le, "end"); ta.selectionStart = ls; ta.selectionEnd = ls + rep.length;
  };
  const wrap = (m, ph) => {
    const s = ta.selectionStart, e = ta.selectionEnd; const sel = ta.value.slice(s, e) || ph;
    ta.setRangeText(m + sel + m, s, e, "end"); ta.selectionStart = s + m.length; ta.selectionEnd = s + m.length + sel.length;
  };
  const done = () => { ta.dispatchEvent(new Event("input", { bubbles: true })); ta.focus(); };
  return h("div", { class: "tb", role: "toolbar", "aria-label": "Yazı biçimlendirme" }, TOOLS.map(([t, k]) => h("button", { type: "button", class: `tb-b tbk-${k}`, onclick: async () => {
    if (k === "h2") lineOp("## "); else if (k === "h3") lineOp("### "); else if (k === "ul") lineOp("- "); else if (k === "q") lineOp("> ");
    else if (k === "b") wrap("**", "kalın yazı"); else if (k === "i") wrap("*", "italik yazı");
    else if (k === "a") {
      const s = ta.selectionStart, e = ta.selectionEnd; const sel = ta.value.slice(s, e);
      const r = await promptDialog("Bağlantı ekle", [{ name: "text", label: "Görünen yazı", value: sel }, { name: "url", label: "Adres", placeholder: "/iletisim/ veya https://…", inputmode: "url", help: "Site içi sayfalar için /iletisim/ gibi yazabilirsiniz." }]);
      if (!r || !r.url) return ta.focus();
      ta.setRangeText(`[${r.text || r.url}](${r.url.replace(/\s/g, "%20")})`, s, e, "end");
    } else if (k === "img") { const md = await onImage(); if (!md) return; const s = ta.selectionStart; ta.setRangeText(`\n\n${md}\n\n`, s, ta.selectionEnd, "end"); }
    done();
  } }, t)));
}
function renderPreview(el, md) {
  el.innerHTML = C.markdown(md) || '<p class="help">Önizlenecek yazı yok.</p>';
  el.querySelectorAll("a").forEach((a) => { const u = a.getAttribute("href") || ""; if (!/^(https?:|\/|#|mailto:|tel:)/i.test(u)) a.setAttribute("href", "#"); a.target = "_blank"; a.rel = "noopener"; });
  el.querySelectorAll("img").forEach((im) => { const u = im.getAttribute("src"); im.removeAttribute("src"); Promise.resolve(imgSrc(u)).then((s) => { if (s) im.src = s; }); });
}
async function editPost(slug) {
  const view = $("#view");
  const isNew = slug === "yeni";
  view.replaceChildren(pageHead({ eyebrow: isNew ? "Yeni yazı" : "Blog yazısı", title: "…", back: ["#/blog", "Blog"] }), skeletonForm());
  await loadTaken();
  let rec = null;
  if (!isNew) {
    const path = `content/blog/${slug}.md`;
    try { const r = await S.gh.read(path); const fm = C.parseFrontmatter(r.content); rec = { path, sha: r.sha, meta: fm.meta, body: fm.body }; }
    catch (e) { if (e.status === 404) { view.replaceChildren(pageHead({ eyebrow: "Blog", title: "Bulunamadı", back: ["#/blog", "Blog"] }), h("div", { class: "empty" }, h("p", {}, "Bu yazı bulunamadı."))); return; } throw e; }
  }
  const meta = rec ? rec.meta : [["title", ""], ["date", C.today()], ["summary", ""], ["cover", ""], ["draft", true]];
  for (const [k, v] of [["title", ""], ["date", C.today()], ["summary", ""], ["cover", ""], ["draft", false]]) if (!meta.some((x) => x[0] === k)) meta.push([k, v]);
  let body = rec ? rec.body : "";
  let curSlug = isNew ? "" : slug, slugTouched = false;
  const g = (k) => C.metaGet(meta, k), s = (k, v) => C.metaSet(meta, k, v);
  const titleEl = h("h1", { class: "vh-t" }, g("title") || "Yeni yazı");
  const draftBadge = badge("Taslak", "b-d");
  const sync = () => { titleEl.textContent = g("title") || "Yeni yazı"; draftBadge.hidden = g("draft") !== true; };

  const slugHelp = h("p", { class: "help" });
  const setSlugHelp = () => { slugHelp.textContent = `${LIVE.replace("https://", "")}/blog/${curSlug || "…"}/` + (isNew ? " — başlıktan otomatik oluşur." : " — yayındaki yazının adresi değiştirilemez."); };
  const slugF = field({ label: "Sitedeki adres", value: curSlug, readonly: !isNew, inputmode: "url", onInput: (v) => { slugTouched = true; curSlug = C.slugify(v); setSlugHelp(); } });
  slugF.append(slugHelp); setSlugHelp();
  if (isNew) $("input", slugF).addEventListener("blur", (e) => { e.target.value = curSlug; });

  const ta = h("textarea", { id: nid(), class: "md", rows: 16, "aria-label": "Yazı metni", placeholder: "Yazınızı buraya yazın. Boş satır yeni paragraf başlatır." });
  ta.value = body;
  ta.addEventListener("input", () => { body = ta.value; dirty(); autoGrow(ta); });
  requestAnimationFrame(() => autoGrow(ta));
  const prog = h("div", { class: "prog", hidden: true });
  const pv = h("div", { class: "pv article", hidden: true });
  const tabW = h("button", { type: "button", role: "tab", "aria-selected": "true", class: "tab" }, "Yaz");
  const tabP = h("button", { type: "button", role: "tab", "aria-selected": "false", class: "tab" }, "Önizleme");
  const writeBox = h("div", {}, mdToolbar(ta, async () => {
    const files = await pickFiles(false); if (!files.length) return null;
    const [u] = await uploadPhotos(files, prog); return u ? `![](${u})` : null;
  }), ta, prog,
    h("p", { class: "help" }, "## Başlık · ### Alt başlık · **kalın** · *italik* · - madde · > alıntı. Boş satır yeni paragraf başlatır."));
  const setTab = (p) => { tabW.setAttribute("aria-selected", String(!p)); tabP.setAttribute("aria-selected", String(p)); writeBox.hidden = p; pv.hidden = !p; if (p) renderPreview(pv, body); };
  tabW.onclick = () => setTab(false); tabP.onclick = () => setTab(true);

  const save = async () => {
    const title = String(g("title") || "").trim();
    if (!title) return toast("Başlığı yazın.", "err");
    if (!curSlug) return toast("Sitedeki adresi yazın.", "err");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(g("date")))) return toast("Tarihi seçin.", "err");
    if (!String(g("summary") || "").trim()) return toast("Kısa özeti yazın.", "err");
    s("title", title);
    const path = `content/blog/${curSlug}.md`;
    const text = C.serializeFrontmatter(meta, body);
    const ch = [{ path, content: text, expectSha: rec ? rec.sha : null }, ...pendingChanges(text)];
    const res = await runSave(() => S.gh.commit(ch, msgOf(isNew ? "Yeni blog yazısı" : "Blog yazısı güncellendi", title))).catch(() => null);
    if (!res) return;
    afterCommit(ch);
    if (rec) rec.sha = res.shas[path];
    else { rec = { path, sha: res.shas[path] }; S.curHash = `#/blog/${curSlug}`; location.hash = S.curHash; }
  };
  const del = rec ? async () => {
    if (!(await confirmDialog(`“${g("title")}” yazısı silinsin mi? Bu işlem geri alınamaz.`, "Yazıyı sil", true))) return;
    const res = await runSave(() => S.gh.commit([{ path: rec.path, delete: true, expectSha: rec.sha }], msgOf("Blog yazısı silindi", g("title")))).catch(() => null);
    if (res) { toast("Yazı silindi.", "ok"); location.hash = "#/blog"; }
  } : null;

  view.replaceChildren(
    h("div", { class: "vh" }, h("a", { class: "back", href: "#/blog" }, svg(IC.back), "Blog"),
      h("div", { class: "vh-row" }, h("div", {}, h("div", { class: "eyebrow" }, isNew ? "Yeni yazı" : "Yazıyı düzenle"), titleEl, h("div", { class: "vh-badges" }, draftBadge)))),
    h("div", { class: "form" },
      section("Yazı bilgileri",
        field({ label: "Başlık", required: true, value: g("title"), onInput: (v) => { s("title", v); sync(); if (isNew && !slugTouched) { curSlug = C.slugify(v); $("input", slugF).value = curSlug; setSlugHelp(); } } }),
        slugF,
        field({ label: "Tarih", type: "date", required: true, value: g("date"), onInput: (v) => s("date", v) }),
        field({ label: "Kısa özet", required: true, multiline: true, rows: 2, value: g("summary"), help: "Listede ve Google'da görünür. 1–2 cümle.", onInput: (v) => s("summary", v) }),
        imageField({ label: "Kapak görseli", get: () => g("cover") || "", set: (v) => s("cover", v), aspect: "16/9" }),
        toggle({ label: "Taslak (yayınlama)", help: "Açıkken yazı sitede görünmez.", checked: g("draft") === true, onChange: (v) => { s("draft", v); sync(); } })),
      h("section", { class: "card" }, h("div", { class: "card-hr" }, h("h2", { class: "eyebrow card-h" }, "Yazı"), h("div", { class: "tabs", role: "tablist" }, tabW, tabP)), writeBox, pv)),
    saveBar({ onSave: save, onDelete: del, deleteLabel: "Sil" }));
  sync();
}

// ================================================================= görsel seçici {proje, foto}
function photoRef({ label, value, onChange }) {
  const box = h("div", { class: "f pref" });
  const draw = () => {
    const p = (S.projects || []).find((x) => x.slug === value.proje);
    const ph = p ? projectPhotos(p.data, p.slug).find((x) => x.nn === value.foto) : null;
    box.replaceChildren(h("div", { class: "lbl" }, label),
      h("div", { class: "pref-row" },
        h("div", { class: "pref-pv" }, ph ? pic(ph.thumb, ph.src, "") : h("span", { class: "imgf-ph" }, svg(IC.img))),
        h("div", { class: "pref-t" }, h("strong", {}, p ? p.data.title : value.proje || "Seçilmedi"), h("span", {}, value.foto ? `Foto ${value.foto}` : "")),
        h("button", { type: "button", class: "btn btn-o btn-sm", onclick: async () => {
          const r = await choosePhoto(value); if (!r) return; value.proje = r.proje; value.foto = r.foto; onChange && onChange(value); dirty(); draw();
        } }, "Değiştir")));
  };
  draw();
  return box;
}
function choosePhoto(cur) {
  return modal((card, close) => {
    card.classList.add("modal-wide");
    const sel = h("select", { id: nid(), "aria-label": "Proje" }, (S.projects || []).map((p) => h("option", { value: p.slug, selected: p.slug === cur.proje }, p.data.title)));
    const grid = h("div", { class: "pgrid" });
    const draw = () => {
      const p = S.projects.find((x) => x.slug === sel.value);
      const ph = p ? projectPhotos(p.data, p.slug) : [];
      grid.replaceChildren(...(ph.length ? ph.map((x) => h("button", { type: "button", class: "pgrid-t" + (p.slug === cur.proje && x.nn === cur.foto ? " sel" : ""), "aria-label": `Foto ${x.nn}`, onclick: () => close({ proje: p.slug, foto: x.nn }) },
        pic(x.thumb, x.src, ""), h("span", {}, x.nn))) : [h("p", { class: "help" }, "Bu projenin fotoğrafı bulunamadı.")]));
    };
    sel.addEventListener("change", draw);
    card.append(h("p", { class: "modal-t" }, "Fotoğraf seçin"), h("div", { class: "f" }, h("label", { for: sel.id }, "Proje"), sel), grid,
      h("div", { class: "modal-b" }, h("button", { class: "btn btn-o", type: "button", onclick: () => close(null) }, "Vazgeç")));
    draw();
  });
}
/** Sıralı proje listesi seçici (slug listesi) */
function projectPicker({ label, help, items }) {
  const box = h("div", { class: "f" });
  const titleOf = (s) => (S.projects || []).find((p) => p.slug === s)?.data.title || `${s} (bulunamadı)`;
  const draw = () => {
    const free = (S.projects || []).filter((p) => !items.includes(p.slug));
    const add = h("select", { "aria-label": "Proje ekle", onchange: (e) => { if (e.target.value) { items.push(e.target.value); dirty(); draw(); } } },
      h("option", { value: "" }, "+ Proje ekle…"), free.map((p) => h("option", { value: p.slug }, p.data.title)));
    box.replaceChildren(h("div", { class: "lbl" }, label), help ? h("p", { class: "help" }, help) : null,
      h("ol", { class: "plist" }, items.map((s, i) => h("li", {}, h("span", { class: "le-n" }, String(i + 1).padStart(2, "0")), h("span", { class: "plist-t" }, titleOf(s)),
        h("span", { class: "le-ctl" }, ctl("up", "Yukarı taşı", () => { move(items, i, i - 1) && (dirty(), draw()); }, i === 0),
          ctl("down", "Aşağı taşı", () => { move(items, i, i + 1) && (dirty(), draw()); }, i === items.length - 1),
          ctl("x", "Kaldır", () => { items.splice(i, 1); dirty(); draw(); }))))),
      free.length ? add : null);
  };
  draw();
  return box;
}

// ================================================================= tek dosyalı içerikler
async function docEditor({ path, eyebrow, title, sub, build, what }) {
  const view = $("#view");
  view.replaceChildren(pageHead({ eyebrow, title }), skeletonForm());
  const [doc] = await Promise.all([loadDoc(path), loadProjects(), loadManifest()]);
  const save = async () => {
    const err = build.validate && build.validate(doc.data); if (err) return toast(err, "err");
    const out = build.beforeSave ? build.beforeSave(doc.data) : doc.data;
    const text = C.toJSON(out);
    const res = await runSave(() => S.gh.commit([{ path, content: text, expectSha: doc.sha }], msgOf(what))).catch(() => null);
    if (res) doc.sha = res.shas[path];
  };
  view.replaceChildren(pageHead({ eyebrow, title, sub }), h("div", { class: "form" }, build.render(doc.data)), saveBar({ onSave: save }));
}

function editSSS() {
  let qMap; // soru nesnesi -> seçili mi
  return docEditor({ path: "content/sss.json", eyebrow: "Sayfa", title: "Sık sorulan sorular", sub: "voxmimarlik.github.io/sss/", what: "SSS güncellendi", build: {
    render(data) {
      data.konular = data.konular || []; data.populer = data.populer || [];
      const allQ = () => data.konular.flatMap((k) => k.qs || []);
      // popüler: metinleri soru nesnelerine bağla (metin değişse de seçim korunur)
      qMap = new Map(); const orphan = [];
      for (const t of data.populer) { const q = allQ().find((x) => x.soru === t && !qMap.has(x)); if (q) qMap.set(q, qMap.size); else orphan.push(t); }
      const popBox = h("div");
      const drawPop = () => {
        popBox.replaceChildren(h("p", { class: "help" }, "SSS sayfasının başındaki “En çok sorulanlar” bölümünde görünür. İşaretleme sırası korunur."),
          data.konular.map((k) => h("fieldset", { class: "popg" }, h("legend", { class: "eyebrow" }, k.t || "(adsız konu)"),
            (k.qs || []).map((q) => { const id = nid(); return h("label", { class: "check", for: id }, h("input", { type: "checkbox", id, checked: qMap.has(q), onchange: (e) => { if (e.target.checked) qMap.set(q, Date.now()); else qMap.delete(q); dirty(); } }), h("span", {}, q.soru || "(boş soru)")); }))),
          orphan.length ? h("p", { class: "help" }, `Eşleşmeyen ${orphan.length} eski kayıt korunuyor.`) : null);
      };
      const konular = listEditor({ items: data.konular, collapsible: true, addLabel: "Konu ekle", itemTitle: (k) => k.t,
        confirmRemove: (k) => `“${k.t || "Adsız"}” konusu ve içindeki ${(k.qs || []).length} soru kaldırılsın mı?`,
        create: () => ({ id: "", t: "", h: "", img: { proje: "", foto: "" }, s: "", qs: [] }),
        render: (k) => { k.img = k.img || { proje: "", foto: "" }; k.qs = k.qs || [];
          return h("div", { class: "sub" },
            field({ label: "Konu adı", required: true, value: k.t, onInput: (v) => (k.t = v) }),
            field({ label: "Bağlantı adı", value: k.id, help: "Küçük harf, Türkçe karaktersiz. Örn. teklif", onInput: (v, el) => { k.id = C.slugify(v); } }),
            field({ label: "Büyük başlık", multiline: true, rows: 2, value: k.h, help: "Satır atlamak için Enter.", onInput: (v) => (k.h = v) }),
            field({ label: "Alt yazı", value: k.s, onInput: (v) => (k.s = v) }),
            photoRef({ label: "Görsel", value: k.img }),
            h("div", { class: "f" }, h("div", { class: "lbl" }, "Sorular"),
              listEditor({ items: k.qs, collapsible: true, addLabel: "Soru ekle", itemTitle: (q) => q.soru, create: () => ({ soru: "", cevap: "" }),
                confirmRemove: (q) => `“${q.soru || "Boş soru"}” kaldırılsın mı?`,
                render: (q) => h("div", { class: "sub" },
                  field({ label: "Soru", required: true, value: q.soru, onInput: (v) => (q.soru = v) }),
                  field({ label: "Cevap", required: true, multiline: true, rows: 3, value: q.cevap, onInput: (v) => (q.cevap = v) })) })));
        } });
      const popSec = section("En çok sorulanlar", popBox);
      const konSec = section("Konular", konular);
      let tmr; const later = () => { clearTimeout(tmr); tmr = setTimeout(drawPop, 250); };
      konSec.addEventListener("input", later); konSec.addEventListener("click", later);
      drawPop();
      this._orphan = orphan;
      return [konSec, popSec];
    },
    validate(data) {
      for (const k of data.konular) { if (!String(k.t || "").trim()) return "Her konunun bir adı olmalı."; for (const q of k.qs || []) if (!String(q.soru || "").trim() || !String(q.cevap || "").trim()) return `“${k.t}” konusunda boş soru veya cevap var.`; }
    },
    beforeSave(data) {
      const all = data.konular.flatMap((k) => k.qs || []);
      const sel = [...qMap.entries()].filter(([q]) => all.includes(q)).sort((a, b) => a[1] - b[1]).map(([q]) => q.soru);
      data.populer = [...sel, ...(this._orphan || [])];
      for (const k of data.konular) if (!k.id) k.id = C.slugify(k.t);
      return data;
    },
  } });
}

function editHizmetler() {
  return docEditor({ path: "content/hizmetler.json", eyebrow: "Sayfa", title: "Hizmetler", sub: "voxmimarlik.github.io/hizmetler/", what: "Hizmetler güncellendi", build: {
    render(data) {
      data.hizmetler = data.hizmetler || [];
      return section("Hizmetler", listEditor({ items: data.hizmetler, collapsible: true, addLabel: "Hizmet ekle", itemTitle: (s) => s.t,
        confirmRemove: (s) => `“${s.t || "Adsız"}” hizmeti kaldırılsın mı? Sitedeki sayfası da kalkar.`,
        create: () => ({ slug: "", t: "", img: { proje: "", foto: "" }, s: "", d: "", li: [], projeler: [] }),
        render: (s) => { s.img = s.img || { proje: "", foto: "" }; s.li = s.li || []; s.projeler = s.projeler || [];
          const slugF = field({ label: "Sitedeki adres", required: true, value: s.slug, help: "Küçük harf, Türkçe karaktersiz. Değiştirirseniz eski bağlantılar çalışmaz.", onInput: (v) => (s.slug = C.slugify(v)) });
          return h("div", { class: "sub" },
            field({ label: "Başlık", required: true, value: s.t, onInput: (v) => (s.t = v) }),
            slugF,
            field({ label: "Kısa açıklama", multiline: true, rows: 2, value: s.s, onInput: (v) => (s.s = v) }),
            field({ label: "Uzun metin", multiline: true, rows: 4, value: s.d, onInput: (v) => (s.d = v) }),
            stringList({ items: s.li, label: "Maddeler", addLabel: "Madde ekle" }),
            photoRef({ label: "Görsel", value: s.img }),
            projectPicker({ label: "Örnek projeler", help: "Hizmet sayfasında gösterilir.", items: s.projeler }));
        } }));
    },
    validate(data) { for (const s of data.hizmetler) { if (!String(s.t || "").trim()) return "Her hizmetin başlığı olmalı."; if (!s.slug) s.slug = C.slugify(s.t); } },
  } });
}

function editSurec() {
  return docEditor({ path: "content/surec.json", eyebrow: "Sayfa", title: "Süreç", sub: "Ana sayfa ve voxmimarlik.github.io/surec/", what: "Süreç güncellendi", build: {
    render(data) {
      data.adimlar = data.adimlar || []; data.sorular = data.sorular || [];
      return [
        section("Adımlar", h("p", { class: "help" }, "Ana sayfada ve Süreç sayfasında sırayla görünür."),
          listEditor({ items: data.adimlar, addLabel: "Adım ekle", itemTitle: (a) => a.baslik, collapsible: false, create: () => ({ baslik: "", aciklama: "" }),
            render: (a) => h("div", { class: "sub" }, field({ label: "Başlık", value: a.baslik, onInput: (v) => (a.baslik = v) }), field({ label: "Açıklama", multiline: true, rows: 3, value: a.aciklama, onInput: (v) => (a.aciklama = v) })) })),
        section("Süreç sayfasındaki sorular",
          listEditor({ items: data.sorular, collapsible: true, addLabel: "Soru ekle", itemTitle: (q) => q.soru, create: () => ({ soru: "", cevap: "" }),
            confirmRemove: (q) => `“${q.soru || "Boş soru"}” kaldırılsın mı?`,
            render: (q) => h("div", { class: "sub" }, field({ label: "Soru", value: q.soru, onInput: (v) => (q.soru = v) }), field({ label: "Cevap", multiline: true, rows: 3, value: q.cevap, onInput: (v) => (q.cevap = v) })) })),
      ];
    },
  } });
}

function editAyarlar() {
  return docEditor({ path: "content/ayarlar.json", eyebrow: "Site", title: "Ayarlar ve iletişim", what: "Ayarlar güncellendi", build: {
    render(d) {
      const tf = (k, label, help, extra = {}) => field({ label, help, value: d[k], onInput: (v) => (d[k] = v), ...extra });
      d.one_cikan_projeler = d.one_cikan_projeler || []; d.instagram_kareleri = d.instagram_kareleri || [];
      d.hakkimizda = d.hakkimizda || {}; const hk = d.hakkimizda; hk.maddeler = hk.maddeler || [];
      return [
        section("İletişim",
          tf("email", "E-posta", null, { type: "email", inputmode: "email" }),
          tf("phone", "Telefon (boşsa görünmez)", "Örn. 0212 909 34 99", { type: "tel", inputmode: "tel" }),
          tf("whatsapp", "WhatsApp (90 ile, boşluksuz)", "Örn. 905389200728 — teklif formu bu numaraya gider.", { inputmode: "numeric" }),
          tf("hero_whatsapp", "Ana banner WhatsApp", "90 ile, boşluksuz.", { inputmode: "numeric" }),
          tf("address", "Adres", null, { multiline: true, rows: 2 }),
          tf("instagram", "Instagram linki", null, { type: "url", inputmode: "url" }),
          tf("ig_handle", "Instagram kullanıcı adı", "Örn. @vox.mimarlik")),
        section("Rakamlar",
          field({ label: "Kuruluş yılı", type: "number", inputmode: "numeric", value: d.founded, onInput: (v) => (d.founded = v === "" ? "" : Number(v)) }),
          tf("projects", "Proje sayısı", "Örn. 150+")),
        section("Ana sayfa",
          projectPicker({ label: "Seçilmiş projeler", help: "Ana sayfada sırayla görünür; ilk 6 tanesi kullanılır.", items: d.one_cikan_projeler }),
          h("div", { class: "f" }, h("div", { class: "lbl" }, "Instagram şeridi"), h("p", { class: "help" }, "Ana sayfadaki 6 kare."),
            listEditor({ items: d.instagram_kareleri, addLabel: "Kare ekle", create: () => ({ proje: (S.projects[0] || {}).slug || "", foto: "01" }),
              render: (x) => photoRef({ label: "Fotoğraf", value: x }) }))),
        section("Hakkımızda",
          field({ label: "Giriş", multiline: true, rows: 2, value: hk.giris, onInput: (v) => (hk.giris = v) }),
          field({ label: "Paragraf 1", multiline: true, rows: 3, value: hk.paragraf1, onInput: (v) => (hk.paragraf1 = v) }),
          field({ label: "Paragraf 2", multiline: true, rows: 3, value: hk.paragraf2, onInput: (v) => (hk.paragraf2 = v) }),
          stringList({ items: hk.maddeler, label: "Maddeler", addLabel: "Madde ekle" }),
          field({ label: "“Vox ses demek” metni", multiline: true, rows: 3, value: hk.vox_metin, onInput: (v) => (hk.vox_metin = v) })),
        advancedAyarlar(d),
      ];
    },
    validate(d) {
      if (d.founded === "" || !Number.isFinite(d.founded)) return "Kuruluş yılını yazın.";
      if (typeof d.talep_url === "string") d.talep_url = d.talep_url.trim();
      if (d.talep_url && !C.talepUrlOk(d.talep_url, { allowLocal: false })) return "Teklif formu bağlantısı https://script.google.com/macros/s/…/exec biçiminde olmalı (ya da boş bırakın).";
    },
  } });
}

/** Ayarlar → Gelişmiş (gizli): teklif formu bağlantısı */
function advancedAyarlar(d) {
  const body = h("div", { hidden: true, id: nid("adv") },
    field({ label: "Teklif formu bağlantısı (teknik)", type: "url", inputmode: "url", value: d.talep_url || "", placeholder: "https://script.google.com/macros/s/…/exec",
      help: "Doluysa sitedeki teklif formu talepleri Google Tablo’ya kaydeder ve Telegram’a bildirir; boşsa form eskisi gibi WhatsApp’ı açar. Genelde Talepler sayfasındaki “Formu bağla” düğmesi doldurur.",
      onInput: (v) => (d.talep_url = v) }));
  const tg = h("button", { type: "button", class: "btn btn-t btn-sm adv-t", "aria-expanded": "false", "aria-controls": body.id, onclick: () => {
    const open = body.hidden; body.hidden = !open; tg.setAttribute("aria-expanded", String(open)); tg.lastChild.textContent = open ? "Gelişmiş ayarları gizle" : "Gelişmiş ayarlar"; } },
    svg(IC.ayarlar), h("span", {}, "Gelişmiş ayarlar"));
  return h("section", { class: "card adv" }, tg, body);
}

// ================================================================= TALEPLER (teklif formu → Google Tablo, Apps Script)
const LEAD_POLL_MS = 60000;
const GRUPLAR = [["tumu", "Tümü"], ["yeni", "Yeni"], ["devam", "Devam eden"], ["kapanan", "Kapanan"]];
const durumSlug = (d) => C.slugify(d || "Yeni") || "yeni";
const leadsClient = () => (S.sess && S.sess.talepler ? new C.Talepler(S.sess.talepler) : null);
function setLeadBadge(rows) {
  const n = C.countNew(rows);
  document.querySelectorAll(".nbadge").forEach((b) => { b.textContent = n > 99 ? "99+" : String(n); b.hidden = !n; });
  const a = document.querySelector('.side a[data-sec="talepler"]');
  if (a) a.setAttribute("aria-label", n ? `Talepler, ${n} yeni` : "Talepler");
}
/** Oturumda talepler yoksa depodaki kasadan almayı dene (başka yönetici kurulum yapmış olabilir) */
async function syncSessTalepler() {
  if (!S.sess || S.sess.talepler || !S.sess.k || S.sess.legacy) return !!(S.sess && S.sess.talepler);
  try {
    const { json } = await S.gh.readUsers();
    const p = await C.readVault(C.parseUsersFile(json || []), S.sess.k);
    if (p && p.talepler) { updateSession({ talepler: p.talepler }); return true; }
  } catch {}
  return false;
}
function stopLeadPoll() { clearInterval(S.leadTimer); S.leadTimer = null; }
function startLeadPoll() {
  stopLeadPoll();
  S.leadTimer = setInterval(() => pollLeads(false), LEAD_POLL_MS);
  pollLeads(false);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && S.sess && S.leadTimer && Date.now() - (S.leadAt || 0) > LEAD_POLL_MS) pollLeads(false); });
async function pollLeads(manual) {
  const cl = leadsClient(); if (!cl || (!manual && document.hidden)) return null;
  try {
    const rows = await cl.list();
    S.leadRows = rows; S.leadAt = Date.now(); S.leadErr = null;
    setLeadBadge(rows);
    if (S.leadView && S.leadView.isConnected && !S.leadBusy()) S.leadRender();
    return rows;
  } catch (e) { S.leadErr = e; if (manual) throw e; return null; }
}

async function leadsPage(sub) {
  const view = $("#view");
  view.replaceChildren(pageHead({ eyebrow: "Teklif formu", title: "Talepler" }), skeletonForm());
  await syncSessTalepler();
  if (!S.sess.talepler || sub === "kurulum") return leadsSetup(view, sub === "kurulum");
  S.leadState = S.leadState || { grup: "tumu", q: "" };
  const st = S.leadState;
  const dirtyNotes = new Map(); // id -> kaydedilmemiş iç not taslağı (yeniden çizimde korunur)
  const list = h("div", { class: "leads", "aria-live": "polite" });
  const chips = h("div", { class: "lchips", role: "group", "aria-label": "Talepleri süz" });
  const search = h("input", { type: "search", class: "lsearch", placeholder: "Ara: ad, telefon, konum…", "aria-label": "Taleplerde ara", value: st.q, autocomplete: "off",
    oninput: () => { st.q = search.value; draw(); } });
  const info = h("p", { class: "lmeta" });
  const refresh = h("button", { class: "btn btn-o btn-sm", type: "button", onclick: async () => {
    busy(refresh, true, "Yenileniyor…");
    try { await pollLeads(true); draw(); toast("Liste güncellendi.", "ok"); } catch (e) { showLeadErr(e); } finally { busy(refresh, false); }
  } }, svg(IC.refresh), "Yenile");
  const formNote = h("div");
  S.leadView = list;
  S.leadBusy = () => dirtyNotes.size > 0 || (document.activeElement && list.contains(document.activeElement) && document.activeElement.tagName !== "BUTTON");
  S.leadRender = () => draw();

  const drawChips = () => {
    const rows = S.leadRows || [];
    chips.replaceChildren(...GRUPLAR.map(([k, t]) => {
      const n = C.filterLeads(rows, { grup: k }).length;
      return h("button", { type: "button", class: "lchip", "aria-pressed": String(st.grup === k), onclick: () => { st.grup = k; draw(); } }, t, h("span", { class: "lchip-n" }, String(n)));
    }));
  };
  const showLeadErr = (e) => {
    if (e.code === "auth") {
      list.replaceChildren(h("div", { class: "note warn" }, h("p", {}, h("strong", {}, "Talepler anahtarı geçersiz. "), isAdmin() ? "Talepler bağlantısını yeniden kurun." : "Yöneticiye haber verin; Talepler kurulumunu yenilemesi gerekiyor."),
        isAdmin() ? h("a", { class: "btn btn-o btn-sm", href: "#/talepler/kurulum" }, "Bağlantıyı yeniden kur") : null));
    } else toast(e.message || "Talepler alınamadı.", "err");
  };
  const draw = () => {
    drawChips();
    const rows = S.leadRows;
    if (!rows) return;
    const shown = C.filterLeads(rows, st);
    info.textContent = S.leadAt ? `${shown.length} talep · son kontrol ${C.trRelTime(new Date(S.leadAt).toISOString()).replace(/^Bugün /, "")}` : "";
    if (!rows.length) {
      list.replaceChildren(h("div", { class: "empty" }, svg(IC.talepler, "ic empty-ic"), h("p", { class: "eyebrow" }, "Henüz talep yok"),
        h("p", {}, "Sitedeki teklif formundan gelen talepler burada ve Telegram'da görünecek. Liste dakikada bir kendiliğinden yenilenir.")));
      return;
    }
    if (!shown.length) { list.replaceChildren(h("div", { class: "empty" }, h("p", {}, st.q ? `“${st.q}” için sonuç yok.` : "Bu grupta talep yok."), h("button", { class: "btn btn-o btn-sm", type: "button", onclick: () => { st.grup = "tumu"; st.q = ""; search.value = ""; draw(); } }, "Tümünü göster"))); return; }
    list.replaceChildren(h("div", { class: "lhead", "aria-hidden": "true" }, h("span", {}, "Tarih"), h("span", {}, "Kişi"), h("span", {}, "Talep"), h("span", {}, "Durum"), h("span", {}, "İç not")),
      ...shown.map(leadCard));
  };
  const leadCard = (r) => {
    const wa = C.waNumber(r.tel);
    const first = String(r.ad || "").trim().split(/\s+/)[0] || "";
    const waText = `Merhaba ${first}, VOX Mimarlık'tan yazıyorum. Web sitemizden ilettiğiniz teklif talebi için teşekkür ederiz.`;
    const sel = h("select", { class: "lst", "aria-label": `${r.ad} için durum`, "data-d": durumSlug(r.durum) },
      ...C.DURUMLAR.map((d) => h("option", { value: d, selected: d === (r.durum || "Yeni") }, d)));
    sel.addEventListener("change", async () => {
      const old = r.durum, val = sel.value;
      sel.dataset.d = durumSlug(val); sel.disabled = true;
      try {
        const row = await leadsClient().update(r.id, { durum: val });
        Object.assign(r, row || { durum: val }); setLeadBadge(S.leadRows);
        toast(`Durum: ${val}`, "ok"); sel.disabled = false;
        card.dataset.d = durumSlug(r.durum); card.dataset.new = String(r.durum === "Yeni");
        upd.textContent = r.guncelleme ? `Güncellendi: ${C.trRelTime(r.guncelleme)}` : ""; drawChips();
      } catch (e) { r.durum = old; sel.value = old || "Yeni"; sel.dataset.d = durumSlug(old); sel.disabled = false; showLeadErr(e); }
    });
    const ta = h("textarea", { class: "lnote-t", rows: 2, placeholder: "Görüşme notu, keşif tarihi…", "aria-label": `${r.ad} için iç not`, maxlength: 2000 });
    ta.value = dirtyNotes.has(r.id) ? dirtyNotes.get(r.id) : r.icnot || "";
    const save = h("button", { type: "button", class: "btn btn-o btn-sm", disabled: !dirtyNotes.has(r.id) }, "Kaydet");
    ta.addEventListener("input", () => { autoGrow(ta); const ch = ta.value !== (r.icnot || ""); save.disabled = !ch; if (ch) dirtyNotes.set(r.id, ta.value); else dirtyNotes.delete(r.id); });
    requestAnimationFrame(() => autoGrow(ta));
    save.addEventListener("click", async () => {
      busy(save, true);
      try {
        const row = await leadsClient().update(r.id, { icnot: ta.value });
        Object.assign(r, row || { icnot: ta.value }); dirtyNotes.delete(r.id); toast("Not kaydedildi.", "ok");
        busy(save, false); save.disabled = true; upd.textContent = r.guncelleme ? `Güncellendi: ${C.trRelTime(r.guncelleme)}` : "";
      } catch (e) { busy(save, false); showLeadErr(e); }
    });
    const upd = h("small", { class: "lupd" }, r.guncelleme ? `Güncellendi: ${C.trRelTime(r.guncelleme)}` : "");
    const facts = [[r.tip, ""], [r.kapsam, ""], [r.alan ? `${r.alan} m²` : "", ""], [r.konum, ""], [r.zaman, ""]].filter(([t]) => t);
    const card = h("article", { class: "lead", "data-d": durumSlug(r.durum), "data-new": String((r.durum || "Yeni") === "Yeni") },
      h("div", { class: "lc-date" }, h("time", { datetime: r.tarih, title: r.tarih ? new Date(r.tarih).toLocaleString("tr-TR") : "" }, C.trRelTime(r.tarih)), h("small", { class: "lid" }, r.id)),
      h("div", { class: "lc-who" },
        h("strong", { class: "lname" }, r.ad || "(adsız)"),
        h("div", { class: "lact" },
          r.tel ? h("a", { class: "lbtn lcall", href: C.telHref(r.tel), "aria-label": `${r.ad} kişisini ara: ${r.tel}` }, svg(IC.phone), h("span", {}, r.tel)) : null,
          wa.length >= 11 ? h("a", { class: "lbtn lwa", href: `https://wa.me/${wa}?text=${encodeURIComponent(waText)}`, target: "_blank", rel: "noopener", "aria-label": `${r.ad} kişisine WhatsApp'tan yaz` }, svg(IC.wa), h("span", {}, "WhatsApp")) : null,
          r.eposta ? h("a", { class: "lmail", href: `mailto:${r.eposta}` }, r.eposta) : null)),
      h("div", { class: "lc-req" },
        facts.length ? h("ul", { class: "lfacts" }, facts.map(([t]) => h("li", {}, t))) : null,
        r.not ? h("p", { class: "lnot" }, r.not) : null,
        r.kaynak ? h("small", { class: "lsrc" }, r.kaynak) : null),
      h("div", { class: "lc-st" }, sel),
      h("div", { class: "lc-note" }, ta, h("div", { class: "lnote-b" }, upd, save)));
    return card;
  };

  // yönetici: sitedeki form henüz bu bağlantıyı kullanmıyorsa tek düğmeyle bağla
  const checkForm = async () => {
    if (!isAdmin()) return;
    try {
      const doc = await loadDoc("content/ayarlar.json");
      if ((doc.data.talep_url || "") === S.sess.talepler.url || !C.talepUrlOk(S.sess.talepler.url, { allowLocal: LOCAL })) return formNote.replaceChildren();
      const b = h("button", { class: "btn btn-d btn-sm", type: "button", onclick: async () => {
        busy(b, true);
        try {
          const d2 = await loadDoc("content/ayarlar.json"); d2.data.talep_url = S.sess.talepler.url;
          const res = await runSave(() => S.gh.commit([{ path: "content/ayarlar.json", content: C.toJSON(d2.data), expectSha: d2.sha }], msgOf("Teklif formu Talepler'e bağlandı")));
          if (res) formNote.replaceChildren(h("div", { class: "note ok" }, h("p", {}, h("strong", {}, "Form bağlandı ✓ "), "Site 1–2 dakika içinde güncellenince yeni talepler buraya ve Telegram'a düşer.")));
        } catch { busy(b, false); }
      } }, "Formu bağla");
      formNote.replaceChildren(h("div", { class: "note warn" }, h("p", {}, h("strong", {}, "Sitedeki teklif formu henüz buraya bağlı değil. "), "Bağlayınca ziyaretçiler formu gönderdiğinde talep tabloya kaydedilir, Telegram'a bildirim gelir ve burada listelenir. (Bağlamazsanız form eskisi gibi WhatsApp'ı açar.)"), b));
    } catch {}
  };

  view.replaceChildren(
    pageHead({ eyebrow: "Teklif formu", title: "Talepler", sub: "Sitedeki teklif formundan gelenler · en yeni üstte", action: refresh }),
    formNote,
    h("div", { class: "ltools" }, chips, h("label", { class: "lsearch-w" }, svg(IC.search), search)),
    info, list,
    isAdmin() ? h("p", { class: "help lfoot" }, "Tüm talepler Google Drive'daki “VOX — Teklif Talepleri” tablosunda da durur. ", h("a", { href: "#/talepler/kurulum" }, "Bağlantı ayarları")) : null);
  if (S.leadRows) draw(); else list.replaceChildren(skeletonForm());
  try { await pollLeads(true); draw(); } catch (e) { if (!S.leadRows) list.replaceChildren(); showLeadErr(e); }
  checkForm();
  if (!S.leadTimer) startLeadPoll();
}

/** Yönetici: Apps Script web uygulaması adresini bağla (ping → claim → kasaya yaz). Editör: bilgi notu. */
async function leadsSetup(view, again) {
  const head = pageHead({ eyebrow: "Teklif formu", title: again ? "Talepler bağlantısı" : "Talepler kurulumu", back: again && S.sess.talepler ? ["#/talepler", "Talepler"] : null });
  if (!isAdmin()) {
    view.replaceChildren(head, h("div", { class: "form form-narrow" }, h("div", { class: "empty" }, svg(IC.talepler, "ic empty-ic"),
      h("p", { class: "eyebrow" }, "Henüz kurulmadı"), h("p", {}, "Yönetici kurulum yapmalı. Kurulum bitince sitedeki teklif formundan gelen talepler burada listelenir."),
      h("button", { class: "btn btn-o btn-sm", type: "button", onclick: () => logout("Kurulum yapıldıysa yeniden giriş yapın.") }, "Kurulum yapıldıysa: çıkış yap ve yeniden gir"))));
    return;
  }
  const stale = !S.sess.k || S.sess.legacy;
  const url = field({ label: "Web uygulaması bağlantısı", type: "url", inputmode: "url", placeholder: "https://script.google.com/macros/s/…/exec", value: again && S.sess.talepler ? S.sess.talepler.url : "",
    help: "Google Apps Script’te “Dağıt → Yeni dağıtım” sonunda verilen “Web uygulaması” adresi. /exec ile biter." });
  const urlIn = $("input", url); urlIn.classList.add("mono");
  const keyF = pwField({ label: "Panel anahtarı (ADMIN_KEY)", autocomplete: "off", help: "Apps Script → sol menü ⚙ Proje ayarları → Komut dosyası özellikleri → ADMIN_KEY satırındaki değer." });
  keyF.input.classList.add("mono");
  const keyBox = h("div", { class: "lkeybox", hidden: true },
    h("div", { class: "note warn" }, h("p", {}, h("strong", {}, "Bu bağlantı daha önce bir panele bağlanmış. "), "Güvenlik için anahtar yalnız bir kez verilir. Kurulum yarıda kaldıysa ya da anahtar yenilendiyse iki yol var:"),
      h("ol", { class: "steps" }, h("li", {}, "Apps Script’teki ADMIN_KEY değerini kopyalayıp aşağıya yapıştırın, ", h("strong", {}, "ya da")), h("li", {}, "ADMIN_KEY satırını silin (çöp kutusu simgesi) ve yeniden “Bağla”ya basın."))),
    keyF.wrap);
  const msg = h("p", { class: "form-msg", role: "alert" });
  const btn = h("button", { class: "btn btn-d", type: "submit", disabled: stale }, svg(IC.talepler), "Bağla");
  let pending = null; // claim edildi ama kasaya yazılamadıysa anahtar burada tutulur (yeniden claim edilemez)
  const saveVault = async (tl) => {
    for (let i = 0; i < 3; i++) {
      const { json, sha } = await S.gh.readUsers();
      const f = C.parseUsersFile(json || []);
      if (f.v !== 2 || !(await C.vaultMatches(f, S.sess.k))) throw new C.PanelError("Oturum bilgileriniz eski. Çıkış yapıp yeniden giriş yapın, sonra tekrar deneyin.", 0, "stale");
      const nf = await C.setTalepler(f, S.sess.k, tl);
      try { return await S.gh.writeUsers(C.serializeUsersFile(nf), sha, `Panel (${S.sess.name}): kullanıcı dosyası güncellendi – Talepler bağlantısı`); }
      catch (e) { if (e.code !== "conflict" || i === 2) throw e; } // başkası aynı anda yazdı: yeniden oku, tekrar dene
    }
  };
  const form = h("form", { novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); msg.textContent = "";
    const u = urlIn.value.trim();
    if (!C.talepUrlOk(u, { allowLocal: LOCAL })) { msg.textContent = "Bağlantı https://script.google.com/macros/s/…/exec biçiminde olmalı. “Web uygulaması” adresini kopyaladığınızdan emin olun."; return urlIn.focus(); }
    busy(btn, true, "Bağlanıyor…");
    try {
      let key = pending && pending.url === u ? pending.key : null;
      const manual = !keyBox.hidden && keyF.input.value.trim();
      if (!key && manual) {
        key = keyF.input.value.trim().replace(/\s+/g, "");
        await new C.Talepler({ url: u, key }).list(); // anahtarı doğrula
      }
      if (!key) {
        const ping = await new C.Talepler({ url: u }).ping();
        if (ping.claimed) { keyBox.hidden = false; keyF.input.focus(); msg.textContent = ""; return; }
        key = await new C.Talepler({ url: u }).claim();
        pending = { url: u, key };
      }
      btn.textContent = "Kaydediliyor…";
      const w = await saveVault({ url: u, key });
      pending = null;
      updateSession({ talepler: { url: u, key } });
      startPoll(w.commit);
      toast("Talepler bağlandı.", "ok");
      location.hash = "#/talepler"; if (location.hash === "#/talepler") route();
      startLeadPoll();
    } catch (err) {
      if (err.status === 401) return;
      msg.textContent = err.code === "auth" ? "Panel anahtarı bu bağlantıyla eşleşmiyor. ADMIN_KEY değerini tam kopyaladığınızdan emin olun."
        : err.code === "claimed" ? "Bu bağlantı az önce başka bir yerden bağlandı. ADMIN_KEY ile devam edin." : (err.message || "Bağlanamadı.") + (pending ? " Anahtar alındı; “Bağla”ya yeniden basarak kaydetmeyi tekrar deneyin." : "");
      if (err.code === "claimed") keyBox.hidden = false;
    } finally { if (btn.isConnected) busy(btn, false); }
  } }, url, keyBox, msg, h("div", { class: "rot-b" }, btn));
  view.replaceChildren(head, h("div", { class: "form form-narrow" },
    stale ? h("div", { class: "note warn" }, h("p", {}, h("strong", {}, "Kurulum için yeniden giriş gerekli. "), "Oturumunuz eski bilgilerle açılmış."), h("button", { type: "button", class: "btn btn-o btn-sm", onclick: () => logout("Lütfen yeniden giriş yapın.") }, "Çıkış yap ve yeniden gir")) : null,
    section("Ne işe yarar?", h("p", { class: "help" }, "Sitedeki teklif formunu dolduran ziyaretçinin bilgileri Google Drive’daki “VOX — Teklif Talepleri” tablosuna kaydedilir, Telegram’a anında bildirim gelir ve burada listelenir. Arayıp durumunu (Arandı, Keşif planlandı…) buradan işaretlersiniz.")),
    section(again ? "Bağlantıyı değiştir" : "Bir kez yapılır", form,
      h("p", { class: "help" }, "Bağlantı ve anahtar, GitHub anahtarı gibi şifrelerinizle kilitli saklanır; tüm panel kullanıcıları talepleri görebilir."))));
  if (!again) setTimeout(() => urlIn.focus(), 50);
}

// ================================================================= KULLANICILAR
const GH_TOKEN_NEW = "https://github.com/settings/personal-access-tokens/new";
const GH_TOKENS = "https://github.com/settings/personal-access-tokens";
const initialsOf = (n) => String(n || "?").split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toLocaleUpperCase("tr");

/** Şifre alanı + Göster düğmesi */
function pwField({ label, autocomplete = "new-password", value = "", visible = false, help }) {
  const id = nid("pw");
  const input = h("input", { id, type: visible ? "text" : "password", autocomplete, autocapitalize: "off", spellcheck: "false", required: true });
  input.value = value;
  const tg = h("button", { type: "button", class: "pw-toggle", "aria-label": "Şifreyi göster", "aria-pressed": String(visible), onclick: () => {
    const on = input.type === "password"; input.type = on ? "text" : "password"; tg.setAttribute("aria-pressed", String(on)); tg.textContent = on ? "Gizle" : "Göster"; } }, visible ? "Gizle" : "Göster");
  const wrap = h("div", { class: "f" }, h("label", { for: id }, label), h("div", { class: "pw" }, input, tg), help ? h("p", { class: "help" }, help) : null);
  return { wrap, input };
}
function strengthMeter(input) {
  const bar = h("div", { class: "meter", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i"));
  const t = h("span", { class: "meter-t" });
  const upd = () => {
    const s = C.passwordStrength(input.value);
    bar.dataset.score = input.value ? String(s.score) : "";
    t.textContent = !input.value ? `En az ${C.MIN_PASS} karakter. En kolayı birkaç kelimelik bir cümle (ör. dört kelime ve bir sayı).` : s.score === 0 ? s.label : `Şifre gücü: ${s.label}`;
  };
  input.addEventListener("input", upd); upd();
  return Object.assign(h("div", { class: "meter-w", "aria-live": "polite" }, bar, t), { refresh: upd });
}
function busy(btn, on, text) { if (on) { btn.dataset.t = btn.textContent; btn.textContent = text || "Kaydediliyor…"; btn.disabled = true; } else { btn.textContent = btn.dataset.t || btn.textContent; btn.disabled = false; } }

/** Şifre değiştir formu (zorunlu ilk değişim ve 'Şifremi değiştir' için ortak) */
function passwordForm({ sess, forced, onDone }) {
  const cur = pwField({ label: forced ? "Geçici şifre" : "Mevcut şifre", autocomplete: "current-password" });
  const nw = pwField({ label: "Yeni şifre", autocomplete: "new-password" });
  const nw2 = pwField({ label: "Yeni şifre (tekrar)", autocomplete: "new-password" });
  const meter = strengthMeter(nw.input);
  nw.wrap.append(meter);
  const msg = h("p", { class: "form-msg", role: "alert", "aria-live": "assertive" });
  const btn = h("button", { class: "btn btn-d btn-block", type: "submit" }, forced ? "Şifremi kaydet ve devam et" : "Şifremi değiştir");
  const hidden = h("input", { type: "text", autocomplete: "username", value: sess.email, hidden: true, readOnly: true, "aria-hidden": "true", tabindex: "-1" });
  const form = h("form", { class: "pwform", novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); msg.textContent = "";
    const a = cur.input.value, b = nw.input.value, c = nw2.input.value;
    if (!a) { msg.textContent = forced ? "Geçici şifrenizi yazın." : "Mevcut şifrenizi yazın."; return cur.input.focus(); }
    if ([...b].length < C.MIN_PASS) { msg.textContent = `Yeni şifre en az ${C.MIN_PASS} karakter olmalı.`; return nw.input.focus(); }
    if (b !== c) { msg.textContent = "Yeni şifreler birbirini tutmuyor."; return nw2.input.focus(); }
    if (a === b) { msg.textContent = "Yeni şifre eskisiyle aynı olamaz."; return nw.input.focus(); }
    busy(btn, true);
    try {
      const gh = S.gh || makeGH(sess);
      const { json, sha } = await gh.readUsers();
      const f = C.parseUsersFile(json || []);
      if (f.v !== 2) throw new C.PanelError("Hesabınız eski biçimde. Çıkış yapıp yeniden giriş yapın.", 0, "v1");
      const nf = await C.changePassword(f, sess.email, a, b);
      const w = await gh.writeUsers(C.serializeUsersFile(nf), sha, `Panel (${sess.name}): kullanıcı dosyası güncellendi – şifre değişti`);
      Object.assign(sess, { mustChange: false });
      updateSession({ mustChange: false });
      cur.input.value = nw.input.value = nw2.input.value = ""; meter.refresh();
      S.migratedCommit = w.commit;
      onDone && onDone(sess);
    } catch (err) {
      if (err.status === 401) return;
      msg.textContent = err.code === "badpass" ? (forced ? "Geçici şifre hatalı." : "Mevcut şifre hatalı.") : err.message || "Kaydedilemedi.";
    } finally { busy(btn, false); }
  } }, hidden, cur.wrap, nw.wrap, nw2.wrap, btn, msg);
  return form;
}

/** Bir kez gösterilen geçici şifre */
function showSecretOnce({ title, who, password }) {
  return modal((card, close) => {
    const code = h("code", { class: "secret-v" }, password);
    const cp = h("button", { type: "button", class: "btn btn-o btn-sm", onclick: async () => {
      try { await navigator.clipboard.writeText(password); cp.textContent = "Kopyalandı ✓"; }
      catch { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); cp.textContent = "Seçildi — kopyalayın"; }
    } }, "Kopyala");
    card.append(h("p", { class: "eyebrow" }, "Geçici şifre"), h("p", { class: "modal-t" }, title),
      h("div", { class: "secret" }, code, cp),
      h("ul", { class: "ticks" },
        h("li", {}, `Bu şifre yalnız şimdi gösterilir. ${who} kişisine yüz yüze veya telefonla iletin (e-postayla göndermeyin).`),
        h("li", {}, "İlk girişte kendi şifresini belirlemesi istenecek."),
        h("li", {}, "Hesap, site yayınlandığında (1–2 dakika) çalışmaya başlar. Giriş adresi: ", h("strong", {}, LIVE.replace("https://", "") + "/panel"))),
      h("div", { class: "modal-b" }, h("button", { class: "btn btn-d", type: "button", autofocus: true, onclick: () => close(true) }, "Tamam, not aldım")));
  });
}

/** Rol seçici (radyo) */
function roleChoice(value) {
  const name = nid("r"); let cur = value;
  const box = h("fieldset", { class: "f seg" }, h("legend", {}, "Rol"),
    h("div", { class: "seg-o" }, Object.entries(C.ROLES).map(([v, t]) => { const id = nid(); return [h("input", { type: "radio", name, id, value: v, checked: v === value, onchange: () => (cur = v) }), h("label", { for: id }, t)]; })),
    h("p", { class: "help" }, "Editör: içerikleri düzenler. Yönetici: ayrıca kullanıcıları ve anahtarı yönetir."));
  return { box, get: () => cur };
}
/** Geçici şifre alanı + 'Rastgele üret' */
function tempPassField(initial = "") {
  const f = pwField({ label: "Geçici şifre", autocomplete: "off", value: initial, visible: true, help: "Kişi ilk girişte kendi şifresini belirler." });
  f.input.classList.add("mono");
  const gen = h("button", { type: "button", class: "btn btn-o btn-sm gen", onclick: () => { f.input.value = C.makePassphrase(); f.input.dispatchEvent(new Event("input")); } }, svg(IC.key), "Rastgele üret");
  const meter = strengthMeter(f.input);
  f.wrap.append(meter, gen);
  return f;
}
function formModal({ eyebrow, title, intro, fields, submitLabel, danger, onSubmit }) {
  return modal((card, close) => {
    const msg = h("p", { class: "form-msg", role: "alert" });
    const btn = h("button", { class: `btn ${danger ? "btn-xd" : "btn-d"}`, type: "submit" }, submitLabel);
    const form = h("form", { novalidate: true, onsubmit: async (e) => {
      e.preventDefault(); msg.textContent = ""; busy(btn, true);
      try { const r = await onSubmit(); close(r ?? true); }
      catch (err) { if (err.code === "conflict") { close(null); await alertDialog("Başka bir yerden değişti, yenileyin.", "Yenile"); route(); } else if (err.status !== 401) msg.textContent = err.message || "Kaydedilemedi."; }
      finally { if (btn.isConnected) busy(btn, false); }
    } }, eyebrow ? h("p", { class: "eyebrow" }, eyebrow) : null, h("p", { class: "modal-t" }, title), intro ? h("div", { class: "modal-i" }, intro) : null, fields,
      msg, h("div", { class: "modal-b" }, h("button", { class: "btn btn-o", type: "button", onclick: () => close(null) }, "Vazgeç"), btn));
    card.append(form);
  });
}

async function usersPage(sub) {
  const view = $("#view");
  if (sub === "anahtar" && isAdmin()) return rotatePage();
  if (sub === "sifre" || !isAdmin()) return accountPage(sub === "sifre");
  const newBtn = h("button", { class: "btn btn-d", type: "button", disabled: true }, svg(IC.plus), "Yeni kullanıcı");
  view.replaceChildren(pageHead({ eyebrow: "Hesap", title: "Kullanıcılar", action: newBtn }), skeletonForm());
  const st = { ...(await S.gh.readUsers()) };
  st.f = C.parseUsersFile(st.json || []);
  const me = S.sess.email;
  const stale = !S.sess.k || S.sess.legacy || st.f.v !== 2 || !(await C.vaultMatches(st.f, S.sess.k));
  const save = async (mutate, what) => {
    const nf = await mutate(st.f);
    const w = await S.gh.writeUsers(C.serializeUsersFile(nf), st.sha, `Panel (${S.sess.name}): kullanıcı dosyası güncellendi – ${what}`);
    st.f = nf; st.sha = w.shas[C.USERS_PATH]; startPoll(w.commit);
    return nf;
  };
  const f = st.f;
  const admins = C.adminCount(f);
  const lastAdmin = (u) => u.role === "yonetici" && admins <= 1;
  newBtn.disabled = stale;
  const openNew = async (pre = {}) => {
    const em = field({ label: "E-posta", type: "email", inputmode: "email", value: pre.email || "", autocomplete: "off" });
    const nm = field({ label: "Ad soyad", value: pre.name || "" });
    const rc = roleChoice("editor");
    const tp = tempPassField(C.makePassphrase());
    let created = null;
    const ok = await formModal({ eyebrow: "Yeni kullanıcı", title: pre.email ? `${pre.name || pre.email} için yeni hesap` : "Panele yeni kişi ekleyin", fields: [em, nm, rc.box, tp.wrap], submitLabel: "Kullanıcıyı ekle",
      onSubmit: async () => {
        created = { email: $("input", em).value.trim().toLowerCase(), name: $("input", nm).value.trim(), role: rc.get(), password: tp.input.value };
        await save((x) => C.addUser(x, S.sess.k, created), "yeni kullanıcı");
      } });
    if (ok && created) { await showSecretOnce({ title: `${created.name} eklendi.`, who: created.name, password: created.password }); route(); }
  };
  newBtn.onclick = () => openNew();

  const row = (u, legacy) => {
    const self = u.email === me;
    const acts = legacy
      ? [h("button", { type: "button", class: "btn btn-o btn-sm", disabled: stale, onclick: () => openNew({ email: u.email, name: u.name }) }, "Yeniden oluştur"),
        h("button", { type: "button", class: "btn btn-x btn-sm", disabled: stale, onclick: () => askRemove(u) }, "Kaldır")]
      : [h("button", { type: "button", class: "btn btn-o btn-sm", disabled: stale || lastAdmin(u), title: lastAdmin(u) ? "Son yönetici" : null, onclick: () => askRole(u) }, "Rol değiştir"),
        h("button", { type: "button", class: "btn btn-o btn-sm", disabled: stale || self, title: self ? "Kendi şifrenizi 'Şifremi değiştir'den değiştirin" : null, onclick: () => askReset(u) }, "Şifre sıfırla"),
        h("button", { type: "button", class: "btn btn-x btn-sm", disabled: stale || self || lastAdmin(u), title: self ? "Kendinizi kaldıramazsınız" : null, onclick: () => askRemove(u) }, "Kaldır")];
    return h("li", { class: "urow" + (legacy ? " is-legacy" : "") },
      h("span", { class: "uav", "aria-hidden": "true" }, initialsOf(u.name || u.email)),
      h("div", { class: "urow-b" },
        h("div", { class: "urow-n" }, h("strong", {}, u.name || u.email), self ? h("span", { class: "urow-me" }, "Siz") : null),
        h("div", { class: "urow-e" }, u.email),
        h("div", { class: "urow-m" },
          legacy ? badge("Eski kayıt – yeniden oluşturun", "b-d") : badge(C.ROLES[u.role] || "Editör", u.role === "yonetici" ? "b-t" : ""),
          !legacy && u.mustChange ? badge("İlk giriş bekleniyor", "b-w") : null,
          !legacy && u.updated ? h("span", { class: "urow-d" }, `Son güncelleme ${C.trDate(u.updated)}`) : null),
        !legacy && self && lastAdmin(u) ? h("p", { class: "urow-d urow-note" }, "Tek yönetici sizsiniz; rolünüz ve hesabınız korunur.") : null),
      h("div", { class: "urow-a" }, acts));
  };
  const askRole = async (u) => {
    const rc = roleChoice(u.role);
    const ok = await formModal({ eyebrow: "Rol değiştir", title: `${u.name} için rol`, fields: [rc.box], submitLabel: "Kaydet",
      onSubmit: async () => { if (rc.get() === u.role) return; await save((x) => C.setRole(x, me, u.email, rc.get()), "rol değişti"); } });
    if (!ok) return;
    toast("Rol güncellendi.", "ok");
    if (u.email === me && rc.get() !== "yonetici") { updateSession({ role: rc.get() }); startApp(S.sess); location.hash = "#/kullanicilar"; return; }
    route();
  };
  const askReset = async (u) => {
    const tp = tempPassField(C.makePassphrase());
    let pw = "";
    const ok = await formModal({ eyebrow: "Şifre sıfırla", title: `${u.name} için yeni geçici şifre`,
      intro: h("p", { class: "help" }, "Eski şifresi artık çalışmaz. İlk girişte kendi şifresini belirlemesi istenir. (Unutulan şifreler kurtarılamaz; sıfırlamak tek yoldur.)"),
      fields: [tp.wrap], submitLabel: "Şifreyi sıfırla",
      onSubmit: async () => { pw = tp.input.value; await save((x) => C.resetPassword(x, S.sess.k, u.email, pw), "şifre sıfırlandı"); } });
    if (ok) { await showSecretOnce({ title: `${u.name} için şifre sıfırlandı.`, who: u.name, password: pw }); route(); }
  };
  const askRemove = async (u) => {
    const ok = await formModal({ eyebrow: "Kullanıcıyı kaldır", title: `${u.name || u.email} panelden kaldırılsın mı?`, danger: true,
      intro: h("div", {}, h("p", {}, "Kişi artık şifresiyle giriş yapamaz."),
        h("p", { class: "warn-t" }, h("strong", {}, "Önemli: "), "Bu kişi panelin ortak GitHub anahtarını kullandığı için erişimini tamamen kesmek üzere hemen ardından anahtarı yenilemeniz gerekir (yaklaşık 5 dakika, adım adım anlatılıyor).")),
      fields: [], submitLabel: "Kaldır ve devam et",
      onSubmit: async () => { await save((x) => C.removeUser(x, me, u.email), "kullanıcı kaldırıldı"); } });
    if (ok) { toast(`${u.name || u.email} kaldırıldı. Şimdi anahtarı yenileyin.`, "ok"); location.hash = "#/kullanicilar/anahtar"; }
  };

  view.replaceChildren(
    pageHead({ eyebrow: "Hesap", title: "Kullanıcılar", sub: "Panele kimlerin girebileceğini buradan yönetin.", action: newBtn }),
    h("div", { class: "form" },
      stale ? h("div", { class: "note warn" }, h("p", {}, h("strong", {}, "Kullanıcı yönetimi için yeniden giriş gerekli. "), "Oturumunuz eski bilgilerle açılmış (ör. anahtar yenilenmiş veya hesabınız yeni biçime geçmemiş)."),
        h("button", { type: "button", class: "btn btn-o btn-sm", onclick: () => logout("Lütfen yeniden giriş yapın.") }, "Çıkış yap ve yeniden gir")) : null,
      f.rotate ? h("div", { class: "note warn" }, h("p", {}, h("strong", {}, "Anahtar yenilenmeli. "), `Kaldırılan: ${f.rotate.removed.join(", ")}. Bu kişiler anahtarı yenileyip eskisini silene kadar siteye GitHub üzerinden erişebilir.`),
        h("a", { class: "btn btn-d btn-sm", href: "#/kullanicilar/anahtar" }, svg(IC.key), "Anahtarı şimdi yenile")) : null,
      section(`Kullanıcılar · ${f.users.length + f.legacy.length}`,
        h("ul", { class: "ulist" }, f.users.map((u) => row(u, false)), f.legacy.map((u) => row(u, true))),
        f.legacy.length ? h("p", { class: "help ulist-help" }, "“Eski kayıt”lar önceki sistemden kalmıştır; hâlâ giriş yapabilirler ama yönetilemezler. “Yeniden oluştur” ile yeni hesap açın.") : null,
        h("p", { class: "help ulist-help" }, "Roller yalnız panel ekranında uygulanır: herkes aynı GitHub anahtarıyla kaydeder. Güvenmediğiniz kişiyi kullanıcı yapmayın.")),
      section("Hesabım",
        h("div", { class: "acc" }, h("span", { class: "uav" }, initialsOf(S.sess.name)), h("div", {}, h("strong", {}, S.sess.name), h("div", { class: "urow-e" }, S.sess.email))),
        h("a", { class: "btn btn-o", href: "#/kullanicilar/sifre" }, svg(IC.lock), "Şifremi değiştir")),
      section("Erişim anahtarı (GitHub)",
        h("p", { class: "help" }, "Panel siteye ortak bir GitHub anahtarıyla kaydeder; anahtar şifrelerinizle kilitli saklanır. Süresi dolduğunda veya birini kaldırdığınızda yenileyin — kalan kullanıcıların şifreleri değişmez."),
        h("a", { class: "btn btn-o", href: "#/kullanicilar/anahtar" }, svg(IC.key), "Anahtarı yenile"))));
}

async function accountPage(focusPw) {
  const view = $("#view");
  const s = S.sess;
  view.replaceChildren(
    pageHead({ eyebrow: "Hesap", title: focusPw ? "Şifremi değiştir" : "Hesabım", back: isAdmin() ? ["#/kullanicilar", "Kullanıcılar"] : null }),
    h("div", { class: "form form-narrow" },
      section("Hesabım",
        h("div", { class: "acc" }, h("span", { class: "uav" }, initialsOf(s.name)), h("div", {}, h("strong", {}, s.name), h("div", { class: "urow-e" }, s.email), h("div", { class: "urow-m" }, badge(C.ROLES[s.role] || "Editör", s.role === "yonetici" ? "b-t" : ""))))),
      section("Şifremi değiştir",
        s.legacy ? h("div", { class: "note" }, h("p", {}, "Hesabınız eski biçimde olduğu için şifre buradan değiştirilemiyor. Yöneticiden hesabınızı “Yeniden oluştur” ile yenilemesini isteyin."))
          : passwordForm({ sess: s, forced: false, onDone: () => { toast("Şifreniz değiştirildi. Yeni şifre 1–2 dakika içinde geçerli olur.", "ok"); if (S.migratedCommit) { startPoll(S.migratedCommit); S.migratedCommit = null; } } }))));
  if (focusPw) setTimeout(() => $(".pwform input[type=password]")?.focus(), 50);
}

async function rotatePage() {
  const view = $("#view");
  view.replaceChildren(pageHead({ eyebrow: "Hesap", title: "Anahtarı yenile", back: ["#/kullanicilar", "Kullanıcılar"] }), skeletonForm());
  const st = await S.gh.readUsers();
  const f = C.parseUsersFile(st.json || []);
  if (f.v !== 2) { view.replaceChildren(pageHead({ eyebrow: "Hesap", title: "Anahtarı yenile", back: ["#/kullanicilar", "Kullanıcılar"] }), h("div", { class: "empty" }, h("p", {}, "Önce çıkış yapıp yeniden giriş yapın (kullanıcı dosyası yeni biçime geçirilecek)."))); return; }
  const tok = pwField({ label: "Yeni anahtar", autocomplete: "off", help: "github_pat_ ile başlar. Yapıştırdıktan sonra kimseyle paylaşmayın." });
  tok.input.classList.add("mono"); tok.input.placeholder = "github_pat_…";
  const msg = h("p", { class: "form-msg", role: "alert" });
  const btn = h("button", { class: "btn btn-d", type: "submit" }, svg(IC.key), "Anahtarı doğrula ve yenile");
  const done = h("div", { hidden: true });
  const form = h("form", { novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); msg.textContent = "";
    const token = tok.input.value.trim().replace(/\s+/g, "");
    if (!token) { msg.textContent = "Yeni anahtarı yapıştırın."; return tok.input.focus(); }
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(token)) { msg.textContent = "Bu bir GitHub anahtarına benzemiyor (github_pat_ ile başlamalı). Tamamını kopyaladığınızdan emin olun."; return; }
    if (token === S.sess.token && !LOCAL) { msg.textContent = "Bu, şu anda kullanılan anahtarın aynısı. GitHub'da yeni bir anahtar oluşturun."; return; }
    busy(btn, true, "Doğrulanıyor…");
    try {
      const ng = new C.GitHub({ token, repo: S.sess.repo, branch: S.gh.branch, name: S.sess.name, email: S.sess.email });
      try { await ng.verify(); await ng.read("content/ayarlar.json"); }
      catch (err) { throw new C.PanelError(err.status === 401 ? "Anahtar geçersiz veya süresi dolmuş." : err.status === 404 || err.status === 403 ? "Bu anahtar site deposunu göremiyor. 3. adımda amucahidb/voxmimarlik-site seçili ve Contents izni verilmiş olmalı." : err.message, err.status, "token"); }
      btn.textContent = "Yenileniyor…";
      const cur = await ng.readUsers();
      const cf = C.parseUsersFile(cur.json || []);
      if (cf.v !== 2 || !cf.users.length) throw new C.PanelError("Kullanıcı dosyası okunamadı. Sayfayı yenileyin.", 0, "v1");
      const r = await C.rotateKey(cf, { token, repo: S.sess.repo, branch: S.sess.branch, talepler: S.sess.talepler || null }, S.sess.k);
      let w;
      try { w = await ng.writeUsers(C.serializeUsersFile(r.file), cur.sha, `Panel (${S.sess.name}): kullanıcı dosyası güncellendi – anahtar yenilendi`); }
      catch (err) { if (err.status === 403) throw new C.PanelError("Bu anahtarın yazma izni yok. 4. adımda Contents: “Read and write” seçilmeli.", 403, "token"); throw err; }
      updateSession({ token, k: r.k });
      S.gh = makeGH(S.sess); startPoll(w.commit);
      tok.input.value = ""; form.hidden = true; done.hidden = false;
      done.replaceChildren(h("div", { class: "note ok" }, h("p", {}, h("strong", {}, "Anahtar yenilendi ✓ "), `${r.file.users.length} kullanıcı şifreleri değişmeden girmeye devam eder.${cf.legacy.length ? ` ${cf.legacy.length} eski kayıt silindi.` : ""}`)),
        h("h3", { class: "steps-h" }, "Son adım: eski anahtarı silin"),
        h("ol", { class: "steps" },
          h("li", {}, "Üstteki durum “Yayında ✓” olana kadar bekleyin (1–2 dakika)."),
          h("li", {}, "GitHub'da anahtarlar sayfasını açın: ", h("a", { href: GH_TOKENS, target: "_blank", rel: "noopener" }, "github.com/settings/personal-access-tokens", svg(IC.ext))),
          h("li", {}, "Listede az önce oluşturduğunuz dışındaki eski panel anahtarına tıklayın → en altta ", h("strong", {}, "Delete"), " → onaylayın."),
          h("li", {}, "Bu kadar. Kaldırılan kişinin erişimi artık tamamen kapandı.")),
        h("a", { class: "btn btn-o", href: "#/kullanicilar" }, "Kullanıcılara dön"));
      toast("Anahtar yenilendi.", "ok");
    } catch (err) {
      if (err.code === "conflict") { await alertDialog("Başka bir yerden değişti, yenileyin.", "Yenile"); route(); }
      else msg.textContent = err.message || "Yenilenemedi.";
    } finally { if (btn.isConnected) busy(btn, false); }
  } },
    h("ol", { class: "steps" },
      h("li", {}, "GitHub'a ", h("strong", {}, "amucahidb"), " hesabıyla girin ve yeni anahtar sayfasını açın: ", h("a", { href: GH_TOKEN_NEW, target: "_blank", rel: "noopener" }, "yeni anahtar oluştur", svg(IC.ext))),
      h("li", {}, h("strong", {}, "Token name: "), `“VOX Panel ${C.today().slice(0, 7)}” · `, h("strong", {}, "Expiration: "), "1 yıl (Custom → bir yıl sonrası)."),
      h("li", {}, h("strong", {}, "Repository access: "), "“Only select repositories” → ", h("code", {}, "amucahidb/voxmimarlik-site"), " (yalnız bu depo)."),
      h("li", {}, h("strong", {}, "Permissions → Repository permissions: "), h("strong", {}, "Contents"), ": “Read and write”, ", h("strong", {}, "Actions"), ": “Read-only”. (Metadata kendiliğinden “Read-only” olur.) Başka izin vermeyin."),
      h("li", {}, "En altta ", h("strong", {}, "Generate token"), "’a basın, ", h("code", {}, "github_pat_"), " ile başlayan anahtarı kopyalayıp aşağıya yapıştırın.")),
    tok.wrap, msg, h("div", { class: "rot-b" }, btn));
  view.replaceChildren(
    pageHead({ eyebrow: "Hesap", title: "Anahtarı yenile", back: ["#/kullanicilar", "Kullanıcılar"] }),
    h("div", { class: "form form-narrow" },
      f.rotate ? h("div", { class: "note warn" }, h("p", {}, h("strong", {}, "Kaldırılan: "), f.rotate.removed.join(", "), ". Bu kişiler eski anahtarı görmüş olabilir; yeni anahtar oluşturup eskisini silene kadar siteye GitHub üzerinden erişebilirler.")) : null,
      section("Neden ve ne zaman?",
        h("p", { class: "help" }, "Panel GitHub'a herkes için ortak bir erişim anahtarıyla bağlanır. Birini kaldırdığınızda veya anahtarın süresi dolduğunda yeni anahtar oluşturup buraya yapıştırın. Kalan kullanıcılar şifreleri değişmeden girmeye devam eder; sonra eski anahtarı GitHub'dan silersiniz.")),
      section("Yeni anahtar oluşturun", form, done)));
}

// ---------------------------------------------------------------- başlat
(function boot() {
  const s = loadSession();
  if (s && s.token) { if (s.mustChange) showForceChange(s); else startApp(s); }
  else showLogin(s && s.expired ? "Oturumunuzun süresi doldu. Lütfen yeniden giriş yapın." : s && s.upgraded ? "Panel güncellendi. Lütfen yeniden giriş yapın." : "");
})();
