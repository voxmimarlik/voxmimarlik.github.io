// VOX Panel — Müşteriler (müşteri portalı yönetimi). Apps Script a_* işlemleri; ortak yardımcılar panel.js'den gelir (X).
import * as PC from "../musteri/portal-core.js";

let X = null;            // panel yardımcıları (h, field, listEditor, …)
let E = null;            // açık proje: { kod, P, pv, M, mv, d, orig }
const thumbs = new Map(); let qT = new Set(), qTimer = null, qCode = "";
const ICM = {
  musteriler: '<path d="M4 20.5V9.5L12 4l8 5.5v11"/><path d="M9.5 20.5v-6h5v6"/>',
  up: '<path d="M12 19V8M7 12.5l5-5 5 5M5 4.5h14"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11"/><path d="M15.5 8.5v-4h-11v11h4"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', file: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/>',
};
export const MUSTERI_ICON = ICM.musteriler;

const api = () => new PC.PortalAPI({ url: X.S.sess.talepler.url, key: X.S.sess.talepler.key });
const portalBase = () => (X.LOCAL ? location.origin + "/musteri/" : X.LIVE + "/musteri/");
const clone = (o) => JSON.parse(JSON.stringify(o));
const rid = () => Math.random().toString(36).slice(2, 10);
const today = () => PC.todayKey();

// ---------------------------------------------------------------- giriş noktası
export async function musterilerPage(ctx, parts) {
  X = ctx;
  const { h, $, pageHead, skeletonForm } = X;
  const view = $("#view");
  view.replaceChildren(pageHead({ eyebrow: "Müşteri portalı", title: "Müşteriler" }), skeletonForm());
  await X.syncSessTalepler();
  if (!X.S.sess.talepler) {
    view.replaceChildren(pageHead({ eyebrow: "Müşteri portalı", title: "Müşteriler" }), h("div", { class: "note warn" }, h("p", {}, h("strong", {}, "Önce Talepler bağlantısı kurulmalı. "), "Müşteri portalı aynı Google Apps Script uygulamasını kullanır."),
      X.isAdmin() ? h("a", { class: "btn btn-o btn-sm", href: "#/talepler/kurulum" }, "Bağlantıyı kur") : h("p", { class: "help" }, "Yöneticiden kurmasını isteyin.")));
    return;
  }
  if (parts[1]) return editor(decodeURIComponent(parts[1]), parts[2] || "genel");
  return list();
}

function notReady(view, head) {
  const { h } = X;
  view.replaceChildren(head, h("div", { class: "note warn" },
    h("p", {}, h("strong", {}, "Google Apps Script henüz güncellenmedi. "), "Portalı açmak için yeni Code.gs'i yapıştırıp yeni sürüm dağıtmak gerekiyor (bir kez, ~3 dakika):"),
    h("ol", { class: "steps" }, h("li", {}, "script.google.com → VOX Talepler projesi → Code.gs içeriğini yeni dosyayla değiştirin, Kaydet."),
      h("li", {}, "Dağıt → Dağıtımları yönet → ✎ Düzenle → Sürüm: Yeni sürüm → Dağıt."), h("li", {}, "İzin istenirse Google Drive iznini onaylayın."), h("li", {}, "Bu sayfayı yenileyin.")),
    h("p", { class: "help" }, "Ayrıntı: depodaki tools/PORTAL.md")));
}

// ---------------------------------------------------------------- liste
async function list() {
  const { h, $, svg, pageHead, badge, IC } = X;
  const view = $("#view");
  const newBtn = h("button", { class: "btn btn-d", type: "button", onclick: () => createDialog() }, svg(IC.plus), "Yeni müşteri");
  const head = (sub) => pageHead({ eyebrow: "Müşteri portalı", title: "Müşteriler", sub, action: newBtn });
  let j;
  try { j = await api().call("a_projects"); }
  catch (e) { if (e.code === "action" || e.code === "auth") return notReady(view, head()); throw e; }
  if (j.url) X.S.portalUrl = j.url;
  const rows = j.rows.slice().sort((a, b) => String(b.son || b.guncelleme).localeCompare(String(a.son || a.guncelleme)));
  view.replaceChildren(head(`${rows.length} proje · müşteriler ${portalBase().replace(/^https?:\/\//, "")} adresinden kod + şifreyle girer`),
    rows.length ? h("div", { class: "mlist" }, rows.map((r) => h("a", { class: "mrow", href: `#/musteriler/${encodeURIComponent(r.kod)}` },
      h("div", { class: "mrow-t" }, h("strong", {}, r.ad), h("span", { class: "mono mrow-k" }, r.kod)),
      h("div", { class: "mrow-b" }, badge(PC.TIP_AD[r.tip] || r.tip, "b-t"), r.durum ? badge(PC.EVRE_AD[r.durum] || r.durum, r.durum === "tamam" ? "b-u" : "") : null, !r.sifre ? badge("Şifre yok", "b-d") : null),
      h("div", { class: "mrow-p" }, h("span", { class: "mbar" }, h("i", { style: { width: r.ilerleme + "%" } })), h("b", {}, `%${r.ilerleme}`)),
      h("p", { class: "mrow-w" }, r.bekleyen ? [h("span", { class: "mrow-l" }, "Müşteriden bekleniyor: "), r.bekleyen] : h("span", { class: "help" }, "Müşteriden beklenen yok")),
      h("small", { class: "mrow-s" }, r.son ? `Son müşteri işlemi: ${relTime(r.son)}` : `Güncellendi: ${relTime(r.guncelleme)}`))))
      : h("div", { class: "empty" }, svg(ICM.musteriler, "ic empty-ic"), h("p", { class: "eyebrow" }, "Henüz müşteri projesi yok"), h("p", {}, "İlk projeyi açın; müşteriye kod ve şifreyi WhatsApp'tan gönderin."), newBtn.cloneNode(true)));
  view.querySelector(".empty .btn")?.addEventListener("click", () => createDialog());
}
function relTime(iso) { try { return X.C.trRelTime(iso); } catch { return iso || ""; } }

function createDialog() {
  const { h, modal, field, segmented, busy, toast } = X;
  return modal((card, close) => {
    const st = { ad: "", konum: "", musteri: "", tip: "tasarim+uygulama", kod: "" };
    let kodEdited = false;
    const fKod = field({ label: "Proje kodu", value: "", help: "Müşteri girişte bu kodu yazar. Otomatik üretilir, isterseniz değiştirin.", onInput: (v, inp) => { kodEdited = true; st.kod = v.toUpperCase(); } });
    const kodIn = fKod.querySelector("input"); kodIn.classList.add("mono");
    const fAd = field({ label: "Proje adı", required: true, placeholder: "Örn. Vaditepe A1 Daire 121", onInput: (v) => { st.ad = v; if (!kodEdited) { st.kod = v.trim() ? PC.makeCode(v) : ""; kodIn.value = st.kod; } } });
    const msg = h("p", { class: "form-msg", role: "alert" });
    const btn = h("button", { class: "btn btn-d", type: "submit" }, "Projeyi aç");
    card.classList.add("modal-wide");
    card.append(h("form", { novalidate: true, onsubmit: async (e) => {
      e.preventDefault(); msg.textContent = "";
      st.kod = kodIn.value.trim().toUpperCase();
      if (!st.ad.trim()) { msg.textContent = "Proje adını yazın."; return; }
      if (!/^[A-Z0-9]{2,12}-[A-Z0-9]{3,6}$/.test(st.kod)) { msg.textContent = "Kod biçimi: HARF-1234 (ör. VADITEPE-7KQ3)."; return; }
      busy(btn, true, "Açılıyor…");
      try {
        const proje = { tip: st.tip, ad: st.ad.trim(), konum: st.konum.trim(), musteri: st.musteri.trim(), durum: st.tip === "uygulama" ? "uygulama" : "tasarim",
          asamalar: st.tip === "uygulama" ? [] : PC.DEFAULT_ASAMALAR.map((ad, i) => ({ id: ["kesif", "yerlesim", "konsept", "render", "teknik"][i], ad, durum: i ? "bekliyor" : "devam", dosyalar: [], sunumlar: [], toplantilar: [], onayIste: true })),
          gecis: { durum: "bekliyor", dosyalar: [], onayIste: true }, takvim: [], raporlar: [], secimler: [], ekIsler: [], odeme: { iban: "TR97 0006 2000 7820 0006 2933 72", alici: "MT VOX MİMARLIK İNŞAAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ", banka: "Garanti Bankası", aciklama: "{kod} – {taksit}", taksitler: [] },
          teslim: { dosyalar: [], eksikler: [], tutanak: { durum: "bekliyor", dosyalar: [], onayIste: true }, belgeler: [], karsilastirma: [], yorumUrl: "https://g.page/r/CZc76JbM0tbiEAE/review" },
          baslangic: { dosyalar: [], formUrl: "" } };
        const r = await api().call("a_project_create", { code: st.kod, tip: st.tip, ad: proje.ad, konum: proje.konum, proje });
        close(true); toast("Proje açıldı. Şimdi müşteri şifresini oluşturun.", "ok");
        location.hash = `#/musteriler/${encodeURIComponent(r.kod)}`;
        setTimeout(() => newPassword(r.kod, proje), 600);
      } catch (err) { msg.textContent = err.message; } finally { if (btn.isConnected) busy(btn, false); }
    } },
      h("p", { class: "eyebrow" }, "Yeni müşteri projesi"), h("p", { class: "modal-t" }, "Proje sayfasını açın"),
      fAd, field({ label: "Konum", placeholder: "Örn. Başakşehir, İstanbul", onInput: (v) => (st.konum = v) }),
      field({ label: "Müşteriye hitap", placeholder: "Örn. Erkan Bey", help: "Hoş geldiniz mesajında ve WhatsApp metninde kullanılır. Soyadı gerekmez.", onInput: (v) => (st.musteri = v) }),
      segmented({ label: "Proje türü", value: st.tip, options: [["tasarim", "Tasarım"], ["uygulama", "Uygulama"], ["tasarim+uygulama", "Tasarım + uygulama"]], onChange: (v) => (st.tip = v) }),
      fKod, msg, h("div", { class: "modal-b" }, h("button", { class: "btn btn-o", type: "button", onclick: () => close(null) }, "Vazgeç"), btn)));
    X.setDirty(false);
  });
}

async function newPassword(kod, P) {
  const { h, modal, toast, confirmDialog } = X;
  if (!(await confirmDialog(`${P.ad} için yeni müşteri şifresi oluşturulsun mu? Eski şifre (varsa) ve açık oturumlar geçersiz olur.`, "Şifre oluştur"))) return;
  const password = PC.makePassword();
  let r;
  try { r = await api().call("a_set_password", { code: kod, password }); } catch (e) { return toast(e.message, "err"); }
  const url = PC.portalLink(portalBase(), kod);
  const msg = PC.waMessage({ ad: P.ad, url, code: kod, password, musteri: P.musteri });
  if (E && E.kod === kod) E.sifre = true;
  await modal((card, close) => {
    const cp = (t, b) => async () => { try { await navigator.clipboard.writeText(t); b.textContent = "Kopyalandı ✓"; } catch { b.textContent = "Kopyalanamadı"; } };
    const b1 = h("button", { type: "button", class: "btn btn-o btn-sm" }, "Şifreyi kopyala"); b1.onclick = cp(password, b1);
    const b2 = h("button", { type: "button", class: "btn btn-d btn-sm" }, "Mesajı kopyala"); b2.onclick = cp(msg, b2);
    card.classList.add("modal-wide");
    card.append(h("p", { class: "eyebrow" }, "Müşteri şifresi"), h("p", { class: "modal-t" }, "Şifre yalnız şimdi gösterilir"),
      h("div", { class: "secret" }, h("code", { class: "secret-v" }, password), b1),
      h("div", { class: "f" }, h("div", { class: "lbl" }, "WhatsApp mesajı"), h("pre", { class: "wamsg" }, msg)),
      h("div", { class: "rot-b mwa" }, b2, h("a", { class: "btn btn-o btn-sm", href: `https://wa.me/?text=${encodeURIComponent(msg)}`, target: "_blank", rel: "noopener" }, "WhatsApp'ta aç")),
      h("p", { class: "help" }, "Şifre Google tablosunda yalnız tuzlu özet olarak saklanır; unutulursa yeni şifre oluşturun."),
      h("div", { class: "modal-b" }, h("button", { class: "btn btn-d", type: "button", autofocus: true, onclick: () => close(true) }, "Tamam, gönderdim")));
  });
  if (r && E && E.kod === kod && E.redraw) E.redraw();
}

async function preview(kod) {
  const w = window.open("about:blank", "_blank");
  try { const r = await api().call("a_preview", { code: kod }); const u = portalBase() + "#onizleme=" + encodeURIComponent(r.token); if (w) w.location = u; else location.href = u; }
  catch (e) { if (w) w.close(); X.toast(e.message, "err"); }
}

// ---------------------------------------------------------------- küçük görseller (panel)
function thumbOf(f, cls = "") {
  const { h } = X;
  const id = f.tid || f.fid;
  const im = h("img", { alt: "", class: cls });
  const wrap = h("span", { class: "pic is-loading" }, im);
  im.addEventListener("load", () => wrap.classList.remove("is-loading"));
  if (thumbs.has(id)) im.src = thumbs.get(id);
  else { im.dataset.tid = id; qT.add(id); clearTimeout(qTimer); qTimer = setTimeout(flush, 30); }
  return wrap;
}
function flush() {
  const ids = [...qT].filter((x) => !thumbs.has(x)); qT = new Set();
  for (let i = 0; i < ids.length; i += 12) {
    const b = ids.slice(i, i + 12);
    api().call("a_thumbs", { code: qCode, ids: b }).then((j) => {
      for (const [id, u] of Object.entries(j.data || {})) { thumbs.set(id, u); document.querySelectorAll(`img[data-tid="${CSS.escape(id)}"]`).forEach((im) => { im.src = u; }); }
      for (const id of b) if (!(j.data || {})[id]) document.querySelectorAll(`img[data-tid="${CSS.escape(id)}"]`).forEach((im) => { im.parentElement.classList.remove("is-loading"); im.parentElement.classList.add("is-empty"); });
    }).catch(() => {});
  }
}
async function openFile(f) {
  const w = window.open("about:blank", "_blank");
  try {
    const j = await api().call("a_file", { code: E.kod, fid: f.fid });
    if (j.url) { w.location = j.url; return; }
    const bin = atob(j.b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    w.location = URL.createObjectURL(new Blob([u8], { type: j.mime || "application/octet-stream" }));
  } catch (e) { if (w) w.close(); X.toast(e.message, "err"); }
}

// ---------------------------------------------------------------- dosya yükleme
const MAX_FILE = 20 * 1024 * 1024;
function pickAny(accept, multiple) {
  return new Promise((res) => { const i = X.h("input", { type: "file", accept, multiple, style: { position: "fixed", left: "-9999px" } }); i.addEventListener("change", () => { res([...i.files]); i.remove(); }); i.addEventListener("cancel", () => { res([]); i.remove(); }); document.body.append(i); i.click(); });
}
async function uploadMany(files, prog, { images }) {
  const { h, toast, resizeImage, blobToB64 } = X;
  const out = [];
  const bar = h("div", { class: "prog-bar" }, h("span")), txt = h("span", { class: "prog-t" });
  prog.replaceChildren(txt, bar); prog.hidden = false;
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const step = (s, k) => { txt.textContent = `${i + 1} / ${files.length} · ${f.name} · ${s}`; bar.firstChild.style.width = `${Math.round(((i + k) / files.length) * 100)}%`; };
      try {
        const isImg = /^image\//.test(f.type) && !/heic|svg/i.test(f.type);
        let body;
        if (isImg) {
          step("küçültülüyor…", 0.1);
          const big = await resizeImage(f, 2400, 0.85), small = await resizeImage(f, 720, 0.78);
          const bm = await createImageBitmap(big); const w = bm.width, hh = bm.height; bm.close && bm.close();
          body = { name: f.name.replace(/\.\w+$/, "") + ".jpg", mime: "image/jpeg", b64: await blobToB64(big), thumb: await blobToB64(small), w, h: hh };
        } else {
          if (f.size > MAX_FILE) throw new Error("20 MB'tan büyük. Dosyayı Drive'daki proje klasörüne koyup “Drive bağlantısı ekle” ile ekleyin.");
          body = { name: f.name, mime: f.type || "application/octet-stream", b64: await blobToB64(f) };
        }
        step("yükleniyor…", 0.5);
        const r = await api().call("a_upload", { code: E.kod, name: body.name, mime: body.mime, b64: body.b64, thumb: body.thumb });
        const d = r.dosya;
        const obj = { fid: d.fid, ad: d.ad, tur: PC.fileKind({ ad: d.ad, tur: isImg ? "gorsel" : "" }), boyut: d.boyut, tarih: today() };
        if (d.tid) obj.tid = d.tid;
        if (body.w) { obj.w = body.w; obj.h = body.h; }
        if (body.thumb) thumbs.set(d.tid, "data:image/jpeg;base64," + body.thumb);
        out.push(obj); step("tamam", 1);
      } catch (e) { toast(`${f.name}: ${e.message}`, "err"); }
    }
  } finally { setTimeout(() => { prog.hidden = true; }, 700); }
  return out;
}

/** Dosya listesi düzenleyici: yükle / Drive bağlantısı / sırala / ad, açıklama, sürüm, gizli */
function filesEditor(arr, { label, help, accept = "image/*,application/pdf,.dwg,.dxf,.zip,.xlsx", single = false, kind = "" } = {}) {
  const { h, svg, IC, listEditor, toast, dirty, promptDialog } = X;
  const box = h("div", { class: "f fed" });
  const prog = h("div", { class: "prog", hidden: true });
  const draw = () => {
    const le = listEditor({ items: arr, numbered: false, collapsible: true, empty: "Henüz dosya yok.",
      confirmRemove: (f) => `“${f.ad}” listeden kaldırılsın mı? (Drive'daki dosya silinmez.)`,
      itemTitle: (f) => [f.gizli ? "🔒 " : "", f.ad || "(adsız)", f.surum ? ` · ${f.surum}` : ""].join(""),
      render: (f) => h("div", { class: "fed-i" },
        h("button", { type: "button", class: "fed-pv", title: "Aç", onclick: () => openFile(f) }, PC.fileKind(f) === "gorsel" ? thumbOf(f) : h("span", { class: "fed-k" }, (PC.fileKind(f) === "html" ? "HTML" : (f.ad || "").split(".").pop() || "DOSYA").toUpperCase().slice(0, 4))),
        h("div", { class: "fed-f" },
          X.field({ label: "Ad", value: f.ad, onInput: (v) => (f.ad = v) }),
          PC.fileKind(f) !== "dosya" || true ? X.field({ label: "Açıklama (isteğe bağlı)", value: f.aciklama || "", onInput: (v) => (f.aciklama = v || undefined) }) : null,
          h("div", { class: "fed-r" }, X.field({ label: "Sürüm / tarih notu", value: f.surum || "", placeholder: "v2 · 5 Ağu", onInput: (v) => (f.surum = v || undefined) }),
            X.toggle({ label: "Müşteriden gizle", checked: !!f.gizli, onChange: (v) => { f.gizli = v || undefined; } })),
          h("small", { class: "help" }, [PC.KIND_AD[PC.fileKind(f)], PC.fileSize(f.boyut)].filter(Boolean).join(" · ")))) });
    const up = h("button", { type: "button", class: "btn btn-o btn-sm" }, svg(ICM.up), single ? (arr.length ? "Değiştir" : "Yükle") : "Dosya yükle");
    up.addEventListener("click", async () => {
      const files = await pickAny(accept, !single); if (!files.length) return;
      const got = await uploadMany(files, prog, {});
      if (!got.length) return;
      if (single) arr.splice(0, arr.length, got[0]); else arr.push(...got);
      dirty(); draw(); toast(`${got.length} dosya eklendi. Müşterinin görmesi için Kaydet'e basın.`, "ok");
    });
    const link = h("button", { type: "button", class: "btn btn-t btn-sm" }, svg(ICM.link), "Drive bağlantısı ekle");
    link.addEventListener("click", async () => {
      const r = await promptDialog("Google Drive dosya bağlantısı", [{ name: "link", label: "Bağlantı veya dosya kimliği", placeholder: "https://drive.google.com/file/d/…", help: "Büyük dosyalar (DWG, video) için: dosyayı Drive'daki proje klasörüne koyun, bağlantısını yapıştırın." }]);
      if (!r || !r.link) return;
      try { const j = await api().call("a_attach", { code: E.kod, link: r.link }); const d = j.dosya; const o = { fid: d.fid, ad: d.ad, tur: PC.fileKind({ ad: d.ad }), boyut: d.boyut, tarih: today() }; if (single) arr.splice(0, arr.length, o); else arr.push(o); dirty(); draw(); }
      catch (e) { toast(e.message, "err"); }
    });
    const imgs = arr.filter((f) => PC.fileKind(f) === "gorsel");
    const strip = imgs.length > 1 ? h("div", { class: "fed-strip" }, imgs.map((f) => h("button", { type: "button", title: f.ad, onclick: () => openFile(f) }, thumbOf(f)))) : null;
    box.replaceChildren(...[h("div", { class: "lbl" }, label, arr.length > 1 ? h("span", { class: "fed-n" }, ` · ${arr.length}`) : null), help ? h("p", { class: "help" }, help) : null, strip, arr.length || !single ? le : null, h("div", { class: "fed-b" }, up, link), prog].filter((x) => x != null));
  };
  draw();
  return box;
}

// ---------------------------------------------------------------- değişiklik notları (müşterinin etkinlik kaydına)
export function diffNotes(a, b) {
  const out = [];
  const by = (arr) => new Map((arr || []).map((x) => [x.id, x]));
  const A = by(a.asamalar);
  for (const s of b.asamalar || []) {
    const o = A.get(s.id);
    if (o && o.durum !== s.durum) out.push(s.durum === "onay" ? `${s.ad} onayınıza gönderildi` : `${s.ad}: ${PC.ASAMA_DURUM[s.durum] || s.durum}`);
    const nf = (s.dosyalar || []).filter((f) => !(o ? o.dosyalar || [] : []).some((g) => g.fid === f.fid)).length;
    if (nf) out.push(`${s.ad}: ${nf} yeni dosya`);
    const nt = (s.toplantilar || []).length - (o ? (o.toplantilar || []).length : 0);
    if (nt > 0) out.push(`Toplantı özeti eklendi: ${s.ad}`);
  }
  if ((a.gecis || {}).durum !== (b.gecis || {}).durum && (b.gecis || {}).durum === "onay") out.push("Uygulama teklifi onayınıza gönderildi");
  const R = by(a.raporlar); for (const r of b.raporlar || []) if (!R.has(r.id) && !r.taslak) out.push(`Haftalık rapor eklendi: ${r.baslik || r.tarih}`);
  const Sx = by(a.secimler); for (const s of b.secimler || []) if (!Sx.has(s.id)) out.push(`Yeni malzeme seçimi: ${s.kalem}`);
  const K = by(a.ekIsler); for (const e of b.ekIsler || []) if (!K.has(e.id)) out.push(`Ek iş onayınıza sunuldu: ${e.baslik}`);
  if (JSON.stringify((a.takvim || []).map((t) => [t.id, t.yuzde, t.bas, t.bit])) !== JSON.stringify((b.takvim || []).map((t) => [t.id, t.yuzde, t.bas, t.bit]))) out.push("İş takvimi güncellendi");
  const T = by((a.odeme || {}).taksitler); for (const t of (b.odeme || {}).taksitler || []) { const o = T.get(t.id); if (t.odendi && !(o && o.odendi)) out.push(`Ödeme alındı: ${t.ad}`); }
  const X2 = by((a.teslim || {}).eksikler); const nd = ((b.teslim || {}).eksikler || []).filter((x) => x.yapildi && !(X2.get(x.id) || {}).yapildi).length;
  if (nd) out.push(`Eksik listesi: ${nd} kalem tamamlandı`);
  if (((a.teslim || {}).tutanak || {}).durum !== ((b.teslim || {}).tutanak || {}).durum && ((b.teslim || {}).tutanak || {}).durum === "onay") out.push("Teslim tutanağı onayınıza gönderildi");
  return out.slice(0, 12);
}

// ---------------------------------------------------------------- düzenleyici
const TABS = [["genel", "Genel"], ["baslangic", "Başlangıç"], ["tasarim", "Tasarım"], ["gecis", "Geçiş"], ["takvim", "Takvim"], ["raporlar", "Raporlar"], ["secimler", "Seçimler"], ["ekisler", "Ek işler"], ["odemeler", "Ödemeler"], ["teslim", "Teslim"], ["kayit", "Kayıt ve yorumlar"]];
async function editor(kod, tab) {
  const { h, $, svg, pageHead, saveBar, setDirty, toast, alertDialog, badge, IC } = X;
  const view = $("#view");
  qCode = kod;
  let j;
  try { j = await api().call("a_project_get", { code: kod }); }
  catch (e) { if (e.code === "action" || e.code === "auth") return notReady(view, pageHead({ eyebrow: "Müşteri portalı", title: kod })); throw e; }
  E = { kod, P: j.proje, pv: j.pv, M: j.m, mv: j.mv, d: j.d, sifre: j.sifre, orig: clone(j.proje) };
  normalize(E.P);
  let cur = TABS.some(([k]) => k === tab) ? tab : "genel";
  const tabsEl = h("div", { class: "mtabs", role: "tablist" });
  const body = h("div", { class: "mbody" });
  const headEl = h("div");
  const drawHead = () => {
    const d = E.d;
    headEl.replaceChildren(pageHead({ eyebrow: `Müşteri portalı · ${kod}`, title: E.P.ad || kod, back: ["#/musteriler", "Müşteriler"],
      action: h("div", { class: "mhead-b" }, h("button", { class: "btn btn-o btn-sm", type: "button", onclick: () => preview(kod) }, svg(IC.eye), "Müşteri görünümü"),
        h("button", { class: "btn btn-o btn-sm", type: "button", onclick: () => newPassword(kod, E.P) }, svg(IC.key), E.sifre ? "Yeni şifre" : "Şifre oluştur")) }),
      h("div", { class: "msum" }, h("span", { class: "mbar big" }, h("i", { style: { width: d.ilerleme + "%" } })), h("b", {}, `%${d.ilerleme}`),
        badge(PC.TIP_AD[E.P.tip], "b-t"), badge(PC.EVRE_AD[E.P.durum] || "", ""), E.P.demo ? badge("Demo", "b-d") : null, !E.sifre ? badge("Şifre yok", "b-d") : null,
        d.bekleyen.length ? h("span", { class: "help" }, `Müşteriden bekleniyor: ${d.bekleyen.map((x) => x.kisa || x.baslik).join(" · ")}`) : h("span", { class: "help" }, "Müşteriden beklenen yok")),
      E.P.demo ? h("div", { class: "note" }, h("p", {}, h("strong", {}, "Demo proje. "), "Bulvar İstanbul E4-D38'in gerçek dosyalarıyla kuruldu; tutarlar yuvarlanmış örnektir, “Örnek” etiketli metinler uydurma değil, yer tutucudur.")) : "");
  };
  const drawTabs = () => tabsEl.replaceChildren(...TABS.filter(([k]) => tabVisible(k)).map(([k, t]) => {
    const n = k === "odemeler" ? E.M.dekontlar.filter((x) => x.durum === "bekliyor").length : k === "kayit" ? E.M.yorumlar.filter((y) => y.kimden === "musteri" && !E.M.yorumlar.some((z) => z.yanit === y.id)).length : 0;
    return h("button", { type: "button", role: "tab", class: "mtab", "aria-selected": String(cur === k), onclick: () => { cur = k; history.replaceState(null, "", `#/musteriler/${encodeURIComponent(kod)}/${k}`); X.S.curHash = location.hash; drawTabs(); drawBody(); } }, t, n ? h("b", { class: "nbadge" }, String(n)) : null);
  }));
  const drawBody = () => { requestAnimationFrame(() => tabsEl.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "center" })); body.replaceChildren(...[].concat(TABBUILD[cur]()).filter(Boolean)); };
  E.redraw = () => { drawHead(); drawTabs(); drawBody(); };
  const bar = saveBar({ onSave: async () => {
    const notlar = diffNotes(E.orig, E.P);
    try {
      const r = await api().call("a_project_save", { code: kod, proje: E.P, base: E.pv, notlar });
      Object.assign(E, { P: r.proje, pv: r.pv, M: r.m, mv: r.mv, d: r.d, orig: clone(r.proje) }); normalize(E.P);
      setDirty(false); toast("Kaydedildi. Müşteri sayfasında hemen görünür.", "ok"); E.redraw();
    } catch (e) {
      if (e.code === "cakisma") { await alertDialog("Bu proje başka bir yerden (başka bir panel ya da müşteri ödemesi) değişti. Sayfayı yenileyip değişikliklerinizi tekrar yapın.", "Yenile"); X.route(); }
      else toast(e.message, "err");
    }
  } });
  view.replaceChildren(headEl, tabsEl, body, bar);
  E.redraw();
  setDirty(false);
}
function normalize(P) {
  P.asamalar ||= []; P.takvim ||= []; P.raporlar ||= []; P.secimler ||= []; P.ekIsler ||= [];
  P.gecis ||= { durum: "bekliyor", dosyalar: [] }; P.gecis.dosyalar ||= [];
  P.odeme ||= {}; P.odeme.taksitler ||= [];
  P.teslim ||= {}; for (const k of ["dosyalar", "eksikler", "belgeler", "karsilastirma"]) P.teslim[k] ||= [];
  P.teslim.tutanak ||= { durum: "bekliyor", dosyalar: [], onayIste: true }; P.teslim.tutanak.dosyalar ||= [];
  P.baslangic ||= {}; P.baslangic.dosyalar ||= [];
  for (const a of P.asamalar) { a.dosyalar ||= []; a.sunumlar ||= []; a.toplantilar ||= []; }
  for (const r of P.raporlar) r.fotolar ||= [];
  for (const s of P.secimler) s.secenekler ||= [];
}
function tabVisible(k) {
  const T = String(E.P.tip).includes("tasarim"), U = String(E.P.tip).includes("uygulama");
  if (k === "tasarim") return T;
  if (k === "gecis") return T && U;
  if (["takvim", "raporlar", "secimler", "ekisler"].includes(k)) return U;
  return true;
}
const STATUS_OPTS = [["bekliyor", "Bekliyor"], ["devam", "Devam ediyor"], ["onay", "Onay bekliyor"], ["onaylandi", "Onaylandı"]];
function receipts(hedef) {
  const { h } = X;
  const rs = E.M.onaylar.filter((o) => o.hedef === hedef);
  if (!rs.length) return null;
  return h("div", { class: "mrcpt" }, h("div", { class: "lbl" }, "Müşteri onayları"), rs.slice().reverse().map((o) => h("div", { class: "mrcpt-i" }, X.svg(ICM.check), h("div", {}, h("strong", {}, `${PC.trStamp(o.ts)} · ${o.ad}`), h("small", {}, `“${o.metin}” · ${o.dosyalar.length} dosya · kayıt ${o.id}`)))));
}
function statusField(obj, hedef, { label = "Durum", help } = {}) {
  const { h, segmented, dirty } = X;
  const eff = hedef.startsWith("asama:") ? E.d.asama[hedef.slice(6)] : hedef === "gecis" ? E.d.gecis : E.d.tutanak;
  const wrap = h("div", {},
    segmented({ label, value: obj.durum || "bekliyor", options: STATUS_OPTS, onChange: (v) => { obj.durum = v; if (v === "onay" && eff === "onaylandi") obj.acildi = new Date().toISOString(); }, help: help || "“Onay bekliyor” seçip kaydedince müşteriye “Onaylıyorum” düğmesi çıkar ve size Telegram'dan haber gelir." }),
    eff === "onaylandi" ? h("p", { class: "help" }, "Müşteri onayladı. Revizyon için “Onay bekliyor” seçip kaydedin: aşama yeniden onaya açılır, eski onay makbuzu saklanır.") : null,
    receipts(hedef));
  return wrap;
}
function dateField(label, obj, key, help) { return X.field({ label, type: "date", value: obj[key] || "", help, onInput: (v) => (obj[key] = v || undefined) }); }
function numField(label, obj, key, help) { return X.field({ label, type: "number", inputmode: "numeric", value: obj[key] ?? "", help, onInput: (v) => (obj[key] = v === "" ? undefined : Number(v)) }); }

const TABBUILD = {
  genel() {
    const { h, field, segmented, section } = X; const P = E.P;
    P.kapak = P.kapak || null;
    const kapakArr = P.kapak ? [P.kapak] : [];
    const kap = filesEditor(kapakArr, { label: "Kapak fotoğrafı", single: true, accept: "image/*", help: "Genel bakışın en üstünde tam genişlikte görünür. Yatay, en güzel kareyi seçin." });
    const sync = new MutationObserver(() => { P.kapak = kapakArr[0] || null; }); sync.observe(kap, { childList: true, subtree: true });
    return [section("Proje", field({ label: "Proje adı", value: P.ad, onInput: (v) => (P.ad = v) }), field({ label: "Konum", value: P.konum || "", onInput: (v) => (P.konum = v) }),
        field({ label: "Müşteriye hitap", value: P.musteri || "", help: "Örn. Erkan Bey. Soyadı ve telefon yazmayın.", onInput: (v) => (P.musteri = v) }),
        segmented({ label: "Proje türü", value: P.tip, options: [["tasarim", "Tasarım"], ["uygulama", "Uygulama"], ["tasarim+uygulama", "Tasarım + uygulama"]], onChange: (v) => { P.tip = v; } }),
        segmented({ label: "Şu anki evre", value: P.durum || "tasarim", options: Object.entries(PC.EVRE_AD), onChange: (v) => (P.durum = v), help: "“Tamamlandı” seçilince ilerleme %100 olur. “Arşiv” için Google tablosunda Durum'u arsiv yapın (giriş kapanır)." })),
      section("Kapak ve karşılama", kap, field({ label: "Hoş geldiniz notu", multiline: true, rows: 4, value: P.hosgeldin || "", onInput: (v) => (P.hosgeldin = v) })),
      section("Sıradaki adım (isteğe bağlı)", h("p", { class: "help" }, "Boş bırakırsanız otomatik: müşteriden beklenen ilk iş, yoksa devam eden aşama."),
        field({ label: "Başlık", value: (P.sonraki || {}).baslik || "", placeholder: "Örn. Konsept sunumu 12 Kasım Perşembe 14:00", onInput: (v) => { P.sonraki = { ...(P.sonraki || {}), baslik: v }; } }),
        field({ label: "Açıklama", value: (P.sonraki || {}).metin || "", onInput: (v) => { P.sonraki = { ...(P.sonraki || {}), metin: v }; } })),
      section("İç not (müşteri görmez)", field({ label: "Not", multiline: true, value: (P.ic || {}).not || "", onInput: (v) => { P.ic = { ...(P.ic || {}), not: v }; } }))];
  },
  baslangic() {
    const { h, field, section, toggle } = X; const B = E.P.baslangic;
    const reh = B.rehber ? [B.rehber] : [];
    const fe = filesEditor(reh, { label: "Süreç rehberi (PDF)", single: true, accept: "application/pdf" });
    new MutationObserver(() => { B.rehber = reh[0] || null; }).observe(fe, { childList: true, subtree: true });
    return [section("Başlangıç", fe, field({ label: "Ön bilgi formu bağlantısı", type: "url", value: B.formUrl || "", onInput: (v) => (B.formUrl = v) }),
      toggle({ label: "Müşteri formu doldurdu", checked: !!B.formTamam, onChange: (v) => (B.formTamam = v) })),
      section("Teklif ve sözleşme", filesEditor(B.dosyalar, { label: "Dosyalar", accept: "application/pdf,image/*" }))];
  },
  tasarim() {
    const { h, field, section, listEditor, stringList, toggle } = X;
    return section("Tasarım aşamaları", h("p", { class: "help" }, "Sıra müşteri sayfasındaki sıradır. Her aşamayı “Onay bekliyor” yapınca müşteri yazılı onay verir."),
      listEditor({ items: E.P.asamalar, collapsible: true, addLabel: "Aşama ekle", itemTitle: (a) => `${a.ad || "(adsız)"} — ${PC.ASAMA_DURUM[E.d.asama[a.id] || a.durum] || ""}`,
        create: () => ({ id: rid(), ad: "Yeni aşama", durum: "bekliyor", dosyalar: [], sunumlar: [], toplantilar: [], onayIste: true }),
        confirmRemove: (a) => `“${a.ad}” aşaması kaldırılsın mı?`,
        render: (a) => h("div", { class: "mstage" },
          field({ label: "Aşama adı", value: a.ad, onInput: (v) => (a.ad = v) }),
          statusField(a, "asama:" + a.id),
          h("div", { class: "fed-r" }, dateField("Planlanan / teslim tarihi", a, "tarih"), toggle({ label: "Müşteri onayı istensin", checked: a.onayIste !== false, onChange: (v) => (a.onayIste = v) })),
          field({ label: "Kısa açıklama", multiline: true, rows: 2, value: a.aciklama || "", onInput: (v) => (a.aciklama = v) }),
          filesEditor(a.dosyalar, { label: "Görseller ve dosyalar", help: "Fotoğraflar telefonda küçültülür. PDF/DWG en fazla 20 MB." }),
          filesEditor(a.sunumlar, { label: "Etkileşimli sunum (HTML)", accept: ".html,text/html", help: "Örn. “Mekânın Anatomisi” tek HTML dosyası. Müşteri tam ekran açar." }),
          h("div", { class: "f" }, h("div", { class: "lbl" }, "Toplantı özetleri"),
            listEditor({ items: a.toplantilar, collapsible: true, addLabel: "Toplantı özeti ekle", itemTitle: (t) => `${t.tarih ? PC.trDate(t.tarih) : ""} ${t.baslik || "Toplantı"}`,
              create: () => ({ id: rid(), tarih: today(), baslik: "Toplantı", kararlar: [], acik: [], sonraki: "" }),
              render: (t) => h("div", {}, h("div", { class: "fed-r" }, dateField("Tarih", t, "tarih"), field({ label: "Başlık", value: t.baslik || "", onInput: (v) => (t.baslik = v) })),
                stringList({ items: t.kararlar, label: "Karar verilenler", addLabel: "Karar ekle" }), stringList({ items: t.acik, label: "Açık kalanlar", addLabel: "Madde ekle" }),
                field({ label: "Sonraki adım", value: t.sonraki || "", onInput: (v) => (t.sonraki = v) })) }))) }));
  },
  gecis() {
    const { h, field, section } = X; const g = E.P.gecis;
    return section("Uygulamaya geçiş — uygulama teklifi", statusField(g, "gecis", { help: "Teklif dosyasını yükleyip “Onay bekliyor” yapın; müşteri teklifi yazılı onaylar." }),
      field({ label: "Açıklama", multiline: true, rows: 2, value: g.aciklama || "", onInput: (v) => (g.aciklama = v) }), filesEditor(g.dosyalar, { label: "Teklif dosyaları", accept: "application/pdf,image/*,.xlsx" }));
  },
  takvim() {
    const { h, field, section, listEditor } = X;
    return section("İş takvimi", h("p", { class: "help" }, "Tarihler ve yüzdeler müşteri sayfasında çubuk grafik olarak görünür; bugünün çizgisi otomatik."),
      listEditor({ items: E.P.takvim, collapsible: true, addLabel: "İş kalemi ekle", itemTitle: (t) => `${t.ad || "(adsız)"} · %${t.yuzde || 0}`,
        create: () => ({ id: rid(), ad: "", bas: today(), bit: today(), yuzde: 0 }),
        render: (t) => {
          const out = h("output", { class: "rng-o" }, `%${t.yuzde || 0}`);
          const rng = h("input", { type: "range", min: 0, max: 100, step: 5, value: t.yuzde || 0, "aria-label": "Tamamlanma yüzdesi", oninput: (e) => { t.yuzde = Number(e.target.value); out.textContent = `%${t.yuzde}`; X.dirty(); } });
          return h("div", {}, field({ label: "İş", value: t.ad, onInput: (v) => (t.ad = v) }), h("div", { class: "fed-r" }, dateField("Başlangıç", t, "bas"), dateField("Bitiş", t, "bit")),
            h("div", { class: "f" }, h("div", { class: "lbl" }, "Tamamlanma"), h("div", { class: "rng" }, rng, out)), field({ label: "Not (isteğe bağlı)", value: t.not || "", onInput: (v) => (t.not = v) }));
        } }));
  },
  raporlar() {
    const { h, field, section, listEditor, toggle } = X;
    return section("Haftalık raporlar", h("p", { class: "help" }, "En yeni üstte görünür. 4–8 fotoğraf önerilir; telefonda çekip doğrudan yükleyebilirsiniz."),
      listEditor({ items: E.P.raporlar, collapsible: true, addLabel: "Yeni rapor", itemTitle: (r) => `${r.tarih ? PC.trDate(r.tarih) : ""} · ${r.baslik || ""}${r.taslak ? " (taslak)" : ""}`,
        create: () => ({ id: rid(), tarih: today(), baslik: `${E.P.raporlar.length + 1}. hafta`, metin: "", fotolar: [] }),
        render: (r) => h("div", {}, h("div", { class: "fed-r" }, dateField("Tarih", r, "tarih"), field({ label: "Başlık", value: r.baslik || "", onInput: (v) => (r.baslik = v) })),
          field({ label: "Bu hafta", multiline: true, rows: 3, value: r.metin || "", onInput: (v) => (r.metin = v) }),
          filesEditor(r.fotolar, { label: "Fotoğraflar", accept: "image/*" }),
          toggle({ label: "Taslak (müşteri görmez)", checked: !!r.taslak, onChange: (v) => (r.taslak = v || undefined) })) }));
  },
  secimler() {
    const { h, field, section, listEditor, toggle } = X;
    return section("Malzeme seçimleri", h("p", { class: "help" }, "Müşteri seçeneklerden birini seçip onaylar; seçim kilitlenir ve size bildirim gelir. Son tarihi sipariş tarihine göre verin."),
      listEditor({ items: E.P.secimler, collapsible: true, addLabel: "Seçim kalemi ekle", itemTitle: (s) => `${s.kalem || "(adsız)"}${s.kesin ? " · kesin" : E.d.secim[s.id] ? " ✓ seçildi" : ""}`,
        create: () => ({ id: rid(), kalem: "", mahal: "", sonTarih: "", secenekler: [] }),
        render: (s) => {
          const ch = E.d.secim[s.id];
          return h("div", {}, ch ? h("div", { class: "note ok" }, h("p", {}, h("strong", {}, "Müşteri seçti: "), `${(s.secenekler.find((o) => o.id === ch.secenek) || {}).ad || ch.secenek} · ${PC.trStamp(ch.ts)} · ${ch.ad}`)) : null,
            field({ label: "Kalem", value: s.kalem, placeholder: "Örn. Zemin seramiği", onInput: (v) => (s.kalem = v) }),
            h("div", { class: "fed-r" }, field({ label: "Mahal", value: s.mahal || "", onInput: (v) => (s.mahal = v) }), dateField("Son seçim tarihi", s, "sonTarih")),
            field({ label: "Not", value: s.aciklama || "", onInput: (v) => (s.aciklama = v) }),
            toggle({ label: "Kesinleşmiş malzeme (müşteri seçim yapmaz, yalnız görür)", checked: !!s.kesin, onChange: (v) => { s.kesin = v || undefined; if (v && !s.urun) s.urun = { id: "urun", ad: "" }; E.redraw(); } }),
            s.kesin ? h("div", { class: "f" }, h("div", { class: "lbl" }, "Ürün"), (() => { const o = (s.urun ||= { id: "urun", ad: "" }); const fa = o.foto ? [o.foto] : []; const fe = filesEditor(fa, { label: "Fotoğraf", single: true, accept: "image/*" }); new MutationObserver(() => { o.foto = fa[0] || undefined; }).observe(fe, { childList: true, subtree: true });
              return h("div", {}, field({ label: "Ürün adı", value: o.ad, onInput: (v) => (o.ad = v) }), field({ label: "Açıklama", value: o.aciklama || "", onInput: (v) => (o.aciklama = v) }), fe); })()) :
            h("div", { class: "f" }, h("div", { class: "lbl" }, "Seçenekler"), listEditor({ items: s.secenekler, collapsible: true, addLabel: "Seçenek ekle", itemTitle: (o) => o.ad || "(adsız)",
              create: () => ({ id: rid(), ad: "" }),
              render: (o) => { const fa = o.foto ? [o.foto] : []; const fe = filesEditor(fa, { label: "Fotoğraf", single: true, accept: "image/*" }); new MutationObserver(() => { o.foto = fa[0] || undefined; }).observe(fe, { childList: true, subtree: true });
                return h("div", {}, field({ label: "Seçenek adı", value: o.ad, onInput: (v) => (o.ad = v) }), field({ label: "Açıklama", value: o.aciklama || "", onInput: (v) => (o.aciklama = v) }), numField("Fiyat farkı (TL, isteğe bağlı)", o, "fark"), fe); } })));
        } }));
  },
  ekisler() {
    const { h, field, section, listEditor, toggle } = X;
    return section("Ek iş ve değişiklik talepleri", h("p", { class: "help" }, "Kaydedince müşteriye “Onaylıyorum / Onaylamıyorum” çıkar. Karar verildikten sonra değiştirilemez; iptal için “İptal” işaretleyin."),
      listEditor({ items: E.P.ekIsler, collapsible: true, addLabel: "Ek iş ekle", itemTitle: (e) => `${e.baslik || "(adsız)"} · ${e.tutar ? PC.money(e.tutar) : ""} · ${{ onay: "Onaylandı", red: "Reddedildi", bekliyor: "Karar bekliyor", iptal: "İptal" }[E.d.ek[e.id]] || "Yeni"}`,
        create: () => ({ id: rid(), baslik: "", aciklama: "", tutar: undefined, gun: undefined, tarih: today() }),
        render: (e) => { const k = E.M.ekKararlar[e.id];
          return h("div", {}, k ? h("div", { class: `note ${k.karar === "onay" ? "ok" : "warn"}` }, h("p", {}, h("strong", {}, k.karar === "onay" ? "Onaylandı: " : "Reddedildi: "), `${PC.trStamp(k.ts)} · ${k.ad}${k.not ? " — “" + k.not + "”" : ""}`)) : null,
            field({ label: "Başlık", value: e.baslik, onInput: (v) => (e.baslik = v) }), field({ label: "Açıklama", multiline: true, rows: 2, value: e.aciklama || "", onInput: (v) => (e.aciklama = v) }),
            h("div", { class: "fed-r" }, numField("Tutar (TL)", e, "tutar"), numField("Süreye etkisi (gün)", e, "gun"), dateField("Tarih", e, "tarih")),
            filesEditor(e.dosyalar ||= [], { label: "Ek dosya (isteğe bağlı)" }), toggle({ label: "İptal (müşteriye “İptal” görünür)", checked: !!e.iptal, onChange: (v) => (e.iptal = v || undefined) })); } }));
  },
  odemeler() {
    const { h, field, section, listEditor, toggle, toast, busy, confirmDialog } = X; const O = E.P.odeme, d = E.d.odeme;
    const pend = E.M.dekontlar.filter((x) => x.durum === "bekliyor");
    const confirmPay = async (dk, karar, btn) => {
      if (X.S.dirty) return toast("Önce değişikliklerinizi kaydedin.", "err");
      const t = O.taksitler.find((x) => x.id === dk.taksit) || {};
      if (!(await confirmDialog(karar === "onay" ? `${t.ad} (${PC.money(t.tutar)}) ödendi olarak işaretlensin mi? Müşteriye “Ödendi” görünür.` : `Dekont kabul edilmesin mi? Müşteri yeniden yükleyebilir.`, karar === "onay" ? "Ödendi" : "Kabul etme", karar !== "onay"))) return;
      busy(btn, true);
      try { const r = await api().call("a_payment_confirm", { code: E.kod, taksit: dk.taksit, dekont: dk.id, karar, tarih: today() }); Object.assign(E, { P: r.proje, pv: r.pv, M: r.m, mv: r.mv, d: r.d, orig: clone(r.proje) }); normalize(E.P); toast("Kaydedildi.", "ok"); E.redraw(); }
      catch (e) { busy(btn, false); toast(e.message, "err"); }
    };
    const sum = h("div", { class: "mpay" },
      h("div", {}, h("div", { class: "eyebrow" }, "Ödenen"), h("b", {}, PC.money(d.odenen))), h("div", {}, h("div", { class: "eyebrow" }, "Kalan"), h("b", {}, PC.money(d.kalan))),
      h("div", {}, h("div", { class: "eyebrow" }, "Toplam"), h("b", {}, PC.money(d.toplam))), h("div", {}, h("div", { class: "eyebrow" }, "Ödeme oranı"), h("b", {}, `%${d.oran}`)),
      h("span", { class: "mbar big" }, h("i", { style: { width: d.oran + "%" } })));
    return [
      pend.length ? section(`Onay bekleyen dekontlar · ${pend.length}`, pend.map((dk) => { const t = O.taksitler.find((x) => x.id === dk.taksit) || {}; const ok = h("button", { class: "btn btn-d btn-sm", type: "button" }, X.svg(ICM.check), "Ödendi"); const no = h("button", { class: "btn btn-x btn-sm", type: "button" }, "Kabul etme");
        ok.onclick = () => confirmPay(dk, "onay", ok); no.onclick = () => confirmPay(dk, "red", no);
        return h("div", { class: "mdek" }, h("button", { type: "button", class: "fed-pv", onclick: () => openFile(dk) }, h("span", { class: "fed-k" }, "DEK")), h("div", {}, h("strong", {}, `${t.ad || ""} · ${PC.money(t.tutar)}`), h("small", { class: "help" }, `${dk.ad} · ${PC.trStamp(dk.ts)}`)), h("div", { class: "mdek-b" }, no, ok)); })) : null,
      section("Özet", sum, d.ekOnayli ? h("p", { class: "help" }, `Müşterinin onayladığı ek işler: ${PC.money(d.ekOnayli)} (taksitlere eklemeyi unutmayın).`) : null),
      section("Banka bilgisi (müşteri kopyalar)", field({ label: "IBAN", value: O.iban || "", placeholder: "TR00 0000 …", onInput: (v) => { O.iban = v; O.ibanOrnek = undefined; } }), field({ label: "Alıcı adı", value: O.alici || "", onInput: (v) => (O.alici = v) }),
        field({ label: "Banka (isteğe bağlı)", value: O.banka || "", onInput: (v) => (O.banka = v) }),
        field({ label: "Ödeme açıklaması şablonu", value: O.aciklama || "{kod} – {taksit}", help: "{kod} proje kodu, {taksit} taksit adıyla değişir. Müşteri tek dokunuşla kopyalar.", onInput: (v) => (O.aciklama = v) }),
        field({ label: "Sayfa notu (isteğe bağlı)", value: O.not || "", onInput: (v) => (O.not = v || undefined) })),
      section("Taksitler", listEditor({ items: O.taksitler, collapsible: true, addLabel: "Taksit ekle", itemTitle: (t) => `${t.odendi ? "✓ " : E.d.taksit[t.id] === "gecikti" ? "! " : ""}${t.ad || "(adsız)"} · ${PC.money(t.tutar)}`,
        create: () => ({ id: rid(), ad: `${O.taksitler.length + 1}. taksit`, tutar: 0, vade: today(), odendi: false }),
        render: (t) => h("div", {}, field({ label: "Ad", value: t.ad, onInput: (v) => (t.ad = v) }), h("div", { class: "fed-r" }, numField("Tutar (TL)", t, "tutar"), dateField("Vade", t, "vade")),
          h("div", { class: "fed-r" }, toggle({ label: "Ödendi", checked: !!t.odendi, onChange: (v) => { t.odendi = v; if (v && !t.odemeTarihi) t.odemeTarihi = today(); } }), dateField("Ödeme tarihi", t, "odemeTarihi"))) })),
      E.M.dekontlar.length ? section("Tüm dekontlar", E.M.dekontlar.slice().reverse().map((dk) => h("button", { type: "button", class: "mdek-r", onclick: () => openFile(dk) }, h("span", {}, dk.ad), h("small", { class: "help" }, `${(O.taksitler.find((x) => x.id === dk.taksit) || {}).ad || ""} · ${PC.trStamp(dk.ts)} · ${{ bekliyor: "bekliyor", onaylandi: "onaylandı", red: "kabul edilmedi" }[dk.durum]}`)))) : null];
  },
  teslim() {
    const { h, field, section, listEditor, toggle } = X; const T = E.P.teslim;
    return [section("Teslim tutanağı", statusField(T.tutanak, "tutanak", { help: "Tutanak PDF'ini yükleyip “Onay bekliyor” yapın; müşteri teslimi yazılı onaylar." }), filesEditor(T.tutanak.dosyalar, { label: "Tutanak", accept: "application/pdf,image/*" })),
      section(`Eksik listesi · ${E.d.eksik.yapilan}/${E.d.eksik.toplam}`, listEditor({ items: T.eksikler, numbered: true, addLabel: "Eksik ekle", itemTitle: null,
        create: () => ({ id: rid(), mahal: "", metin: "", yapildi: false }),
        render: (x) => h("div", { class: "mpunch" }, h("label", { class: "mchk" }, h("input", { type: "checkbox", checked: !!x.yapildi, onchange: (e) => { x.yapildi = e.target.checked; X.dirty(); } }), h("span", {}, "Tamam")),
          field({ label: "Mahal", value: x.mahal || "", onInput: (v) => (x.mahal = v) }), field({ label: "Eksik", value: x.metin || "", onInput: (v) => (x.metin = v) })) })),
      section("Teslim dosyaları", filesEditor(T.dosyalar, { label: "Dosyalar (müşteri “Tümünü indir” ile alır)" })),
      section("Garanti ve kullanım belgeleri", filesEditor(T.belgeler, { label: "Belgeler", accept: "application/pdf,image/*" })),
      section("Tasarım – uygulama karşılaştırması", listEditor({ items: T.karsilastirma, collapsible: true, addLabel: "Karşılaştırma ekle", itemTitle: (c) => c.baslik || "(adsız)",
        create: () => ({ id: rid(), baslik: "", aEt: "Tasarım", bEt: "Uygulama" }),
        render: (c) => { const A = c.a ? [c.a] : [], B = c.b ? [c.b] : [];
          const fa = filesEditor(A, { label: "Sol görsel", single: true, accept: "image/*" }), fb = filesEditor(B, { label: "Sağ görsel", single: true, accept: "image/*" });
          new MutationObserver(() => { c.a = A[0] || undefined; }).observe(fa, { childList: true, subtree: true }); new MutationObserver(() => { c.b = B[0] || undefined; }).observe(fb, { childList: true, subtree: true });
          return h("div", {}, field({ label: "Mahal", value: c.baslik || "", onInput: (v) => (c.baslik = v) }), h("div", { class: "fed-r" }, field({ label: "Sol etiket", value: c.aEt || "", onInput: (v) => (c.aEt = v) }), field({ label: "Sağ etiket", value: c.bEt || "", onInput: (v) => (c.bEt = v) })), h("div", { class: "fed-r" }, fa, fb)); } }),
        field({ label: "Not (isteğe bağlı)", value: T.karsilastirmaNot || "", onInput: (v) => (T.karsilastirmaNot = v || undefined) })),
      section("Değerlendirme", field({ label: "Değerlendirme formu bağlantısı", type: "url", value: T.degerlendirmeUrl || "", onInput: (v) => (T.degerlendirmeUrl = v) }),
        field({ label: "Google yorum bağlantısı", type: "url", value: T.yorumUrl || "", onInput: (v) => (T.yorumUrl = v) }))];
  },
  kayit() {
    const { h, section, toast, busy } = X;
    const ys = E.M.yorumlar.slice().reverse();
    const reply = (y) => {
      const ta = h("textarea", { rows: 2, placeholder: "Yanıtınız (müşteri sayfasında görünür)", maxlength: 2000 });
      const b = h("button", { class: "btn btn-o btn-sm", type: "button" }, "Yanıtla");
      b.onclick = async () => { if (!ta.value.trim()) return ta.focus(); busy(b, true); try { const r = await api().call("a_reply", { code: E.kod, hedef: y.hedef, metin: ta.value.trim(), yanit: y.id }); E.M = r.m; E.mv = r.mv; E.d = r.d; toast("Yanıt gönderildi.", "ok"); E.redraw(); } catch (e) { busy(b, false); toast(e.message, "err"); } };
      return h("div", { class: "mreply" }, ta, b);
    };
    return [section(`Yorumlar · ${ys.length}`, ys.length ? ys.map((y) => h("div", { class: `mcmt ${y.kimden}` }, h("div", { class: "mcmt-h" }, h("strong", {}, y.kimden === "vox" ? "VOX" : y.ad || "Müşteri"), h("span", { class: "help" }, `${y.baslik} · ${PC.trStamp(y.ts)}`)), h("p", {}, y.metin),
      y.kimden === "musteri" && !E.M.yorumlar.some((z) => z.yanit === y.id) ? reply(y) : null)) : h("p", { class: "help" }, "Henüz yorum yok.")),
      section("Etkinlik kaydı", h("ol", { class: "mlog" }, E.M.log.slice().reverse().map((l) => h("li", {}, h("span", { class: `mlog-k ${l.kim}` }, l.kim === "vox" ? "VOX" : "Müşteri"), h("span", {}, l.ne), h("small", { class: "help" }, PC.trStamp(l.ts))))))];
  },
};
