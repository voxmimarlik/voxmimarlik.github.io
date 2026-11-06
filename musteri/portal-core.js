// VOX müşteri portalı — saf yardımcılar + Apps Script istemcisi (portal ve panel ortak kullanır, Node'da test edilir)

export const PHONES = [["0538 920 07 28", "+905389200728"], ["0535 264 42 29", "+905352644229"]];
export const WHATSAPP = "905389200728";
export const TIP_AD = { tasarim: "Tasarım", uygulama: "Uygulama", "tasarim+uygulama": "Tasarım + Uygulama" };
export const EVRE_AD = { baslangic: "Başlangıç", tasarim: "Tasarım", gecis: "Uygulamaya geçiş", uygulama: "Uygulama", teslim: "Teslim", tamam: "Tamamlandı" };
export const ASAMA_DURUM = { bekliyor: "Bekliyor", devam: "Devam ediyor", onay: "Onay bekliyor", onaylandi: "Onaylandı" };
export const TAKSIT_DURUM = { odendi: "Ödendi", bekliyor: "Bekliyor", gecikti: "Gecikti", inceleniyor: "Dekont inceleniyor" };
export const DEFAULT_ASAMALAR = ["Keşif ve rölöve", "Yerleşim", "Konsept ve moodboard", "3D ve render", "Teknik çizim"];
export const ONAY_METNI = "Bu aşamayı onaylıyorum. Onaylanan aşamaya dönüş ek iş sayılır.";

const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const AYK = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

/** 1215000 → "1.215.000 TL" */
export function money(n, { unit = true } = {}) {
  const v = Math.round(Number(n) || 0);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (v < 0 ? "-" : "") + s + (unit ? " TL" : "");
}
/** "2026-11-10" → "10 Kasım 2026" | short: "10 Kas" | day: "10 Kasım 2026, Salı" */
export function trDate(iso, { short = false, year = true, day = false } = {}) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "";
  const d = Number(m[3]), mo = Number(m[2]) - 1;
  if (short) return `${d} ${AYK[mo]}`;
  let s = `${d} ${AY[mo]}${year ? " " + m[1] : ""}`;
  if (day) s += ", " + GUN[new Date(Date.UTC(+m[1], mo, d)).getUTCDay()];
  return s;
}
/** ISO zaman damgası → İstanbul saatine göre "6 Ağustos 2026 · 19:22" */
export function trStamp(ts) {
  const t = Date.parse(ts); if (!isFinite(t)) return "";
  const d = new Date(t + 3 * 3600e3);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${AY[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
export function todayKey(now = Date.now()) { return new Date(now + 3 * 3600e3).toISOString().slice(0, 10); }
export function daysUntil(iso, now = Date.now()) { const a = Date.parse(todayKey(now)), b = Date.parse(String(iso || "").slice(0, 10)); return isFinite(b) ? Math.round((b - a) / 864e5) : null; }

export function fileKind(f) {
  if (!f) return "dosya";
  if (f.tur === "gorsel" || f.tur === "html") return f.tur;
  const ext = String(f.ad || "").toLowerCase().split(".").pop();
  if (["jpg", "jpeg", "png", "webp", "heic", "gif"].includes(ext)) return "gorsel";
  if (ext === "pdf") return "pdf";
  if (["dwg", "dxf"].includes(ext)) return "dwg";
  if (["html", "htm"].includes(ext)) return "html";
  if (["xlsx", "xls", "csv"].includes(ext)) return "tablo";
  if (["zip", "rar", "7z"].includes(ext)) return "arsiv";
  return f.tur || "dosya";
}
export const KIND_AD = { gorsel: "Görsel", pdf: "PDF", dwg: "DWG çizim", html: "Etkileşimli sunum", tablo: "Tablo", arsiv: "Arşiv", dosya: "Dosya" };
export function fileSize(b) {
  b = Number(b) || 0;
  if (!b) return "";
  const u = ["B", "KB", "MB", "GB"]; let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return (i ? b.toFixed(1).replace(".", ",").replace(/,0$/, "") : String(Math.round(b))) + " " + u[i];
}
export function payText(tpl, taksit, P = {}) {
  return String(tpl || "{kod} – {taksit}").replace("{taksit}", (taksit && taksit.ad) || "").replace("{kod}", P.kod || "").trim();
}
export const ibanCompact = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();
export const ibanPretty = (s) => ibanCompact(s).replace(/(.{4})/g, "$1 ").trim();

/** iş takvimi: tarih aralığına göre yüzde konumları */
export function gantt(items, today) {
  const ds = items.flatMap((x) => [x.bas, x.bit]).filter(Boolean).sort();
  if (!ds.length) return { start: "", end: "", rows: [], today: null, months: [] };
  const start = ds[0], end = ds[ds.length - 1];
  const t0 = Date.parse(start), t1 = Date.parse(end) + 864e5, span = Math.max(864e5, t1 - t0);
  const pos = (iso) => ((Date.parse(iso) - t0) / span) * 100;
  const rows = items.map((x) => { const l = x.bas ? pos(x.bas) : 0; const r = x.bit ? pos(x.bit) + (864e5 / span) * 100 : l + 2; return { left: Math.max(0, l), width: Math.max(1.2, r - l) }; });
  const tp = today ? pos(today) + (864e5 / span) * 50 : null;
  const months = [];
  const d = new Date(t0); d.setUTCDate(1);
  while (d.getTime() < t1) { const k = d.toISOString().slice(0, 10); const p = Math.max(0, pos(k)); months.push({ label: AY[d.getUTCMonth()], left: p }); d.setUTCMonth(d.getUTCMonth() + 1); }
  return { start, end, rows, today: tp != null && tp >= 0 && tp <= 100 ? tp : null, months };
}

const FOLD = { ç: "C", ğ: "G", ı: "I", i: "I", ö: "O", ş: "S", ü: "U", Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U" };
const ALNUM = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const rnd = () => { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0] / 4294967296; };
/** "Bulvar İstanbul E4-D38" → "BULVAR-7KQ3" */
export function makeCode(name, r = rnd) {
  const w = String(name || "").split(/\s+/).map((x) => x.replace(/[çğıiöşüÇĞİÖŞÜ]/g, (c) => FOLD[c]).toUpperCase().replace(/[^A-Z0-9]/g, "")).filter((x) => x.length >= 2)[0] || "PROJE";
  let s = ""; for (let i = 0; i < 4; i++) s += ALNUM[Math.floor(r() * ALNUM.length)];
  return w.slice(0, 10) + "-" + s;
}
const WORDS = ("kum liman deniz bulut orman nehir tepe vadi ada gemi yelken rota pusula defter kalem kemer kolon duvar tavan zemin pencere kapi bahce cini mermer meşe ceviz keten pamuk taş tuğla avlu çeşme fener kule köprü çınar zeytin lavanta").split(" ");
/** okunur müşteri şifresi: "meşe-liman-47" (≈ 40·40·90 ≈ 144 bin; giriş kilidiyle birlikte yeterli) */
export function makePassword(r = rnd) {
  const pick = () => WORDS[Math.floor(r() * WORDS.length)];
  let a = pick(), b = pick(); while (b === a) b = pick();
  return `${a}-${b}-${String(10 + Math.floor(r() * 90))}`;
}
export function portalLink(base, code) { return String(base || "https://voxmimarlik.github.io/musteri/").replace(/#.*$/, "") + "#" + code; }
export function waMessage({ ad, url, code, password, musteri }) {
  return `Merhaba${musteri ? " " + musteri : ""}, ${ad} projenizin sayfası hazır.\n\nProje portalınız: ${url}\nProje kodu: ${code}\nŞifre: ${password}\n\nTasarım dosyaları, onaylar, iş takvimi, haftalık raporlar ve ödemeler bu sayfada. Telefonunuzun ana ekranına ekleyebilirsiniz.\n\nVOX Mimarlık`;
}

/** gün içi hedef adı (yorum/onay başlıkları) */
export function hedefLabel(P, hedef) {
  if (hedef === "gecis") return "Uygulama teklifi";
  if (hedef === "tutanak") return "Teslim tutanağı";
  if (hedef === "genel") return "Genel";
  const m = /^(asama|rapor|secim|ek|taksit):(.+)$/.exec(String(hedef || ""));
  if (!m) return "";
  const arr = { asama: P.asamalar, rapor: P.raporlar, secim: P.secimler, ek: P.ekIsler, taksit: (P.odeme || {}).taksitler }[m[1]] || [];
  const it = arr.find((x) => String(x.id) === m[2]);
  return it ? it.ad || it.baslik || it.kalem || "" : "";
}

// ---------------------------------------------------------------- Apps Script istemcisi
export const PORTAL_ERR = {
  login: "Proje kodu veya şifre hatalı.", kilit: "Çok fazla hatalı deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.",
  oturum: "Oturumunuzun süresi doldu. Lütfen yeniden giriş yapın.", zaten: "Bu işlem daha önce kaydedilmiş.",
  erken: "Bu aşama henüz onaya açılmadı.", ad: "Lütfen adınızı ve soyadınızı yazın.", metin: "Lütfen bir mesaj yazın.",
  buyuk: "Dosya çok büyük. En fazla 4 MB yükleyebilirsiniz (telefon fotoğrafları otomatik küçültülür).", tur: "Yalnız fotoğraf veya PDF yükleyebilirsiniz.",
  dosya: "Dosya okunamadı. Lütfen tekrar deneyin.", onizleme: "Önizleme modundasınız; işlem kaydedilmedi.", yok: "Dosya bulunamadı.",
  hedef: "Bu öğe bulunamadı. Sayfayı yenileyin.", secenek: "Seçenek bulunamadı. Sayfayı yenileyin.", karar: "Geçersiz karar.",
  server: "Sunucu hata verdi. Biraz sonra tekrar deneyin.", bad: "Geçersiz istek.", auth: "Panel anahtarı geçersiz.",
  cakisma: "Bu proje başka bir yerden değişti. Sayfayı yenileyip tekrar deneyin.", var: "Bu proje kodu zaten kullanılıyor.", kod: "Proje kodu geçersiz.",
  sifre: "Şifre en az 8 karakter olmalı.", tip: "Proje türü geçersiz.", kimlik: "Aynı kimlikli iki öğe var.", liste: "Liste biçimi bozuk.",
  baglanti: "Drive bağlantısı tanınmadı.", action: "Portal sunucusu henüz güncellenmedi.",
};
export class PortalError extends Error { constructor(msg, code) { super(msg); this.code = code; } }

export class PortalAPI {
  constructor({ url, key, token, fetchFn } = {}) { this.url = url; this.key = key; this.token = token; this.fetch = fetchFn || globalThis.fetch.bind(globalThis); }
  async call(action, extra = {}) {
    let r;
    const body = { action, ...extra };
    if (this.key && action.startsWith("a_")) body.key = this.key;
    if (this.token && action.startsWith("p_") && action !== "p_login") body.token = this.token;
    try { r = await this.fetch(this.url, { method: "POST", cache: "no-store", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) }); }
    catch { throw new PortalError("Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.", "network"); }
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j || typeof j !== "object") throw new PortalError("Sunucu yanıt vermedi. Biraz sonra tekrar deneyin.", "network");
    if (!j.ok) { const e = new PortalError(PORTAL_ERR[j.error] || "İşlem yapılamadı.", j.error || "error"); e.data = j; throw e; }
    return j;
  }
  /** sunucu portalı destekliyor mu? (eski dağıtım: ping'de portal alanı yok) */
  async ready() { try { const j = await this.call("ping"); return !!j.portal; } catch (e) { if (e.code === "network") throw e; return false; } }
}
