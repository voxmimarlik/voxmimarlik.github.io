// VOX Panel — çekirdek (arayüzden bağımsız): şifreleme, GitHub istemcisi, Markdown, ön bilgi, yardımcılar.
// Tarayıcıda ve Node'da (testler) aynı kodla çalışır. Harici kütüphane yok.

export const LIVE = "https://voxmimarlik.github.io";
export const PBKDF2_ITER = 600000;
export const WORKFLOW_FILE = "yayin.yml"; // "Siteyi yayınla"
export const MAX_UPLOAD = 8 * 1024 * 1024;

const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;

// ---- base64 (UTF-8 güvenli)
export function bytesToB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function b64ToBytes(b64) {
  const s = atob(String(b64).replace(/\s+/g, ""));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export const utf8ToB64 = (t) => bytesToB64(enc.encode(t));
export const b64ToUtf8 = (b) => dec.decode(b64ToBytes(b));

// ---- kullanıcı kaydı: PBKDF2-SHA256(şifre, salt, 600000) -> AES-GCM-256
async function deriveKey(password, salt, iter) {
  const base = await subtle().importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function encryptUser({ email, name, password, payload, iter = PBKDF2_ITER }) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter);
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload))));
  return { email: String(email).trim().toLowerCase(), name, salt: bytesToB64(salt), iv: bytesToB64(iv), iter, data: bytesToB64(ct) };
}
/** Doğru şifrede {token, repo, branch}; yanlışta null. Bilinmeyen e-postada da aynı süreyi harcar. */
export async function decryptUser(users, email, password) {
  const em = String(email || "").trim().toLowerCase();
  const u = (Array.isArray(users) ? users : []).find((x) => String(x.email || "").toLowerCase() === em);
  const rec = u || { salt: "AAAAAAAAAAAAAAAAAAAAAA==", iv: "AAAAAAAAAAAAAAAA", iter: PBKDF2_ITER, data: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" };
  try {
    const key = await deriveKey(String(password || ""), b64ToBytes(rec.salt), rec.iter || PBKDF2_ITER);
    const pt = await subtle().decrypt({ name: "AES-GCM", iv: b64ToBytes(rec.iv) }, key, b64ToBytes(rec.data));
    if (!u) return null;
    const p = JSON.parse(dec.decode(pt));
    if (!p || !p.token || !p.repo) return null;
    return { token: p.token, repo: p.repo, branch: p.branch || "main", name: u.name || em, email: em };
  } catch { return null; }
}

// ================================================================ v2 kullanıcı dosyası
// {"v":2, "users":[{email,name,role,pub,priv,wrap,mustChange,created,updated}], "vault":{iv,data}, "legacy":[v1…], "rotate":{since,removed}}
//  vault = AES-GCM(K) {token,repo,branch}  ·  K = rastgele 32 bayt (kasa anahtarı)
//  priv  = AES-GCM(PBKDF2(şifre)) kullanıcının ECDH P-256 özel anahtarı (pkcs8)
//  wrap  = K, ECDH(geçici anahtar, kullanıcı pub) -> HKDF-SHA256 -> AES-GCM ile kullanıcıya sarılmış
// Şifre değişimi yalnız kendi priv'ini, anahtar yenileme ise yalnız pub'ları kullanır (şifre gerekmez).
export const USERS_PATH = "src/panel/users.json";
export const ROLES = { yonetici: "Yönetici", editor: "Editör" };
export const MIN_PASS = 12;
const ECDH = { name: "ECDH", namedCurve: "P-256" };
const HKDF_INFO = "vox-panel-v2/kasa";
const rnd = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
const normEmail = (e) => String(e || "").trim().toLowerCase();
const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const STALE = "Oturum bilgileriniz eski (anahtar yenilenmiş olabilir). Çıkış yapıp yeniden giriş yapın.";

async function aesSeal(key, bytes) {
  const iv = rnd(12);
  return { iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, key, bytes))) };
}
async function aesOpen(key, box) {
  return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: b64ToBytes(box.iv) }, key, b64ToBytes(box.data)));
}
const aesKey = (raw) => subtle().importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);

async function kek(privKey, pubKey, epkRaw, userPubRaw) {
  const shared = await subtle().deriveBits({ name: "ECDH", public: pubKey }, privKey, 256);
  const hk = await subtle().importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  const info = new Uint8Array([...enc.encode(HKDF_INFO), ...userPubRaw]);
  return subtle().deriveKey({ name: "HKDF", hash: "SHA-256", salt: epkRaw, info }, hk, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
/** K'yı kullanıcının açık anahtarına sar (şifre gerekmez) */
export async function wrapFor(K, pubB64) {
  const pubRaw = b64ToBytes(pubB64);
  const pub = await subtle().importKey("raw", pubRaw, ECDH, false, []);
  const eph = await subtle().generateKey(ECDH, false, ["deriveBits"]);
  const epkRaw = new Uint8Array(await subtle().exportKey("raw", eph.publicKey));
  return { epk: bytesToB64(epkRaw), ...(await aesSeal(await kek(eph.privateKey, pub, epkRaw, pubRaw), K)) };
}
async function unwrapWith(privKey, pubB64, wrap) {
  const epkRaw = b64ToBytes(wrap.epk);
  const epk = await subtle().importKey("raw", epkRaw, ECDH, false, []);
  return aesOpen(await kek(privKey, epk, epkRaw, b64ToBytes(pubB64)), wrap);
}
async function sealPriv(pkcs8, password, iter) {
  const salt = rnd(16);
  const box = await aesSeal(await deriveKey(password, salt, iter), pkcs8);
  return { salt: bytesToB64(salt), iv: box.iv, iter, data: box.data };
}
async function openPriv(priv, password) { // hatalı şifrede istisna
  const pkcs8 = await aesOpen(await deriveKey(String(password || ""), b64ToBytes(priv.salt), priv.iter || PBKDF2_ITER), priv);
  return { pkcs8, key: await subtle().importKey("pkcs8", pkcs8, ECDH, false, ["deriveBits"]) };
}
async function newKeyPair(password, iter) {
  const kp = await subtle().generateKey(ECDH, true, ["deriveBits"]);
  const pub = bytesToB64(new Uint8Array(await subtle().exportKey("raw", kp.publicKey)));
  const pkcs8 = new Uint8Array(await subtle().exportKey("pkcs8", kp.privateKey));
  return { pub, priv: await sealPriv(pkcs8, password, iter) };
}
/** Kasa içeriği: {token, repo, branch, talepler?:{url,key}} — talepler yoksa eski biçimle birebir aynı */
function vaultPayload(payload) {
  const o = { token: payload.token, repo: payload.repo, branch: payload.branch || "main" };
  const t = payload.talepler;
  if (t && typeof t === "object" && t.url && t.key) o.talepler = { url: String(t.url), key: String(t.key) };
  return o;
}
async function sealVault(K, payload) {
  return aesSeal(await aesKey(K), enc.encode(JSON.stringify(vaultPayload(payload))));
}
async function openVault(K, vault) {
  const p = JSON.parse(dec.decode(await aesOpen(await aesKey(K), vault)));
  if (!p || !p.token || !p.repo) throw new Error("kasa");
  return p;
}
/** Oturumdaki K (b64) dosyadaki kasayı açıyor mu? Açmıyorsa (anahtar yenilenmiş) STALE hatası. */
async function checkK(f, kB64) {
  if (!kB64 || !f.vault) throw new PanelError(STALE, 0, "stale");
  const K = b64ToBytes(kB64);
  try { return { K, payload: await openVault(K, f.vault) }; } catch { throw new PanelError(STALE, 0, "stale"); }
}

/** Oturumdaki K bu dosyanın kasasını açıyor mu? */
export async function vaultMatches(f, kB64) { try { await checkK(f, kB64); return true; } catch { return false; } }

/** users.json (v1 dizi veya v2 nesne) -> {v, users, legacy, vault, rotate} */
export function parseUsersFile(json) {
  if (Array.isArray(json)) return { v: 1, users: [], legacy: json.filter((x) => x && x.email), vault: null, rotate: null };
  if (json && json.v === 2) return { v: 2, users: (json.users || []).map((u) => ({ ...u })), legacy: [...(json.legacy || [])], vault: json.vault || null, rotate: json.rotate || null };
  return { v: 2, users: [], legacy: [], vault: null, rotate: null };
}
export function serializeUsersFile(f) {
  const o = { v: 2, users: f.users, vault: f.vault };
  if (f.legacy && f.legacy.length) o.legacy = f.legacy;
  if (f.rotate) o.rotate = f.rotate;
  return toJSON(o);
}
export const adminCount = (f) => f.users.filter((u) => u.role === "yonetici").length;
function checkPass(pw) {
  if ([...String(pw || "")].length < MIN_PASS) throw new PanelError(`Şifre en az ${MIN_PASS} karakter olmalı.`, 400, "weak");
}
function checkEmail(em) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) throw new PanelError("Geçerli bir e-posta adresi yazın.", 400, "email");
}
async function makeUser({ email, name, role, password, K, iter = PBKDF2_ITER, mustChange, created }) {
  const kp = await newKeyPair(password, iter);
  const t = nowIso();
  return { email, name, role, pub: kp.pub, priv: kp.priv, wrap: await wrapFor(K, kp.pub), mustChange: !!mustChange, created: created || t, updated: t };
}

/** Yeni dosya: kasa + ilk kullanıcı(lar). {file, k} */
export async function initUsersFile(payload, first, legacy = []) {
  const K = rnd(32);
  const file = { v: 2, users: [], vault: await sealVault(K, payload), legacy, rotate: null };
  if (first) {
    const em = normEmail(first.email); checkEmail(em); checkPass(first.password);
    file.users.push(await makeUser({ ...first, email: em, role: first.role || "yonetici", K }));
  }
  return { file, k: bytesToB64(K) };
}

/**
 * Giriş. v2: PBKDF2 -> priv -> ECDH ile K -> kasa -> anahtar. v1 kayıtları (legacy) eski yolla.
 * Her hatada null (bilinmeyen e-postada da aynı süre).
 */
export async function login(json, email, password) {
  const f = parseUsersFile(json);
  const em = normEmail(email);
  const u = f.users.find((x) => normEmail(x.email) === em);
  if (u) {
    try {
      const { key } = await openPriv(u.priv, password);
      const K = await unwrapWith(key, u.pub, u.wrap);
      const p = await openVault(K, f.vault);
      return { v: 2, token: p.token, repo: p.repo, branch: p.branch || "main", talepler: vaultPayload(p).talepler || null, name: u.name || em, email: em, role: u.role === "yonetici" ? "yonetici" : "editor", mustChange: !!u.mustChange, k: bytesToB64(K), legacy: false };
    } catch { return null; }
  }
  const lu = f.legacy.find((x) => normEmail(x.email) === em);
  const r = await decryptUser(lu ? [lu] : [], em, password);
  if (!r) return null;
  // v1 dosyasında herkes eski kayıttır; ilk başarılı girişte dosya v2'ye çevrilir ve bu kişi yönetici olur
  return { ...r, v: 1, role: f.v === 1 ? "yonetici" : "editor", mustChange: false, k: null, legacy: true, fileV: f.v };
}

/** v1 -> v2: giriş yapan kişi yönetici olur, diğer v1 kayıtları legacy'de kalır. {file, k} */
export async function migrateV1(json, email, password, payload) {
  const f = parseUsersFile(json);
  if (f.v !== 1) throw new PanelError("Dosya zaten yeni biçimde.", 400, "notv1");
  const em = normEmail(email);
  const me = f.legacy.find((x) => normEmail(x.email) === em);
  if (!me || !(await decryptUser([me], em, password))) throw new PanelError("Eski kayıt doğrulanamadı.", 400, "denied");
  const K = rnd(32);
  const user = await makeUser({ email: em, name: me.name || em, role: "yonetici", password, K, iter: me.iter || PBKDF2_ITER, mustChange: false });
  const file = { v: 2, users: [user], vault: await sealVault(K, payload), legacy: f.legacy.filter((x) => normEmail(x.email) !== em), rotate: null };
  return { file, k: bytesToB64(K) };
}

/** Şifremi değiştir: mevcut şifreyle priv açılır, yeni şifreyle yeniden kilitlenir; mustChange temizlenir. */
export async function changePassword(f, email, oldPw, newPw) {
  checkPass(newPw);
  if (oldPw === newPw) throw new PanelError("Yeni şifre eskisiyle aynı olamaz.", 400, "same");
  const em = normEmail(email);
  const i = f.users.findIndex((x) => normEmail(x.email) === em);
  if (i < 0) throw new PanelError("Hesabınız bulunamadı. Yöneticiye haber verin.", 404, "nouser");
  let pkcs8;
  try { ({ pkcs8 } = await openPriv(f.users[i].priv, oldPw)); } catch { throw new PanelError("Mevcut şifre hatalı.", 400, "badpass"); }
  const users = [...f.users];
  users[i] = { ...users[i], priv: await sealPriv(pkcs8, newPw, users[i].priv.iter || PBKDF2_ITER), mustChange: false, updated: nowIso() };
  return { ...f, users };
}

/** Yönetici: yeni kullanıcı (geçici şifre, mustChange). Aynı e-postalı eski kayıt (legacy) varsa onun yerine geçer. */
export async function addUser(f, kB64, { email, name, role, password, iter }) {
  const { K } = await checkK(f, kB64);
  const em = normEmail(email); checkEmail(em);
  if (!String(name || "").trim()) throw new PanelError("Ad soyad yazın.", 400, "name");
  if (!ROLES[role]) throw new PanelError("Rol seçin.", 400, "role");
  checkPass(password);
  if (f.users.some((x) => normEmail(x.email) === em)) throw new PanelError("Bu e-posta ile bir kullanıcı zaten var.", 409, "dup");
  const u = await makeUser({ email: em, name: String(name).trim(), role, password, K, iter, mustChange: true });
  return { ...f, users: [...f.users, u], legacy: f.legacy.filter((x) => normEmail(x.email) !== em) };
}

/** Yönetici: şifre sıfırla — yeni anahtar çifti, K yeniden sarılır, mustChange. */
export async function resetPassword(f, kB64, email, password, { iter } = {}) {
  const { K } = await checkK(f, kB64);
  checkPass(password);
  const em = normEmail(email);
  const i = f.users.findIndex((x) => normEmail(x.email) === em);
  if (i < 0) throw new PanelError("Kullanıcı bulunamadı.", 404, "nouser");
  const old = f.users[i];
  const users = [...f.users];
  users[i] = await makeUser({ email: old.email, name: old.name, role: old.role, password, K, iter: iter || old.priv?.iter || PBKDF2_ITER, mustChange: true, created: old.created });
  return { ...f, users };
}

function guardAdmin(f, actor) {
  const a = f.users.find((x) => normEmail(x.email) === normEmail(actor));
  if (!a || a.role !== "yonetici") throw new PanelError("Bu işlem yalnız yöneticiler içindir.", 403, "role");
}
/** Yönetici: rol değiştir. Son yönetici yöneticilikten çıkarılamaz. */
export function setRole(f, actor, email, role) {
  guardAdmin(f, actor);
  if (!ROLES[role]) throw new PanelError("Rol seçin.", 400, "role");
  const em = normEmail(email);
  const i = f.users.findIndex((x) => normEmail(x.email) === em);
  if (i < 0) throw new PanelError("Kullanıcı bulunamadı.", 404, "nouser");
  if (f.users[i].role === "yonetici" && role !== "yonetici" && adminCount(f) <= 1)
    throw new PanelError("Son yönetici editör yapılamaz. Önce başka birini yönetici yapın.", 400, "lastadmin");
  const users = [...f.users];
  users[i] = { ...users[i], role, updated: nowIso() };
  return { ...f, users };
}
/** Yönetici: kaldır. Erişimi tamamen kesmek için ardından rotateKey gerekir (dosyada 'rotate' işareti kalır). */
export function removeUser(f, actor, email) {
  guardAdmin(f, actor);
  const em = normEmail(email);
  const u = f.users.find((x) => normEmail(x.email) === em);
  const lu = f.legacy.find((x) => normEmail(x.email) === em);
  if (!u && !lu) throw new PanelError("Kullanıcı bulunamadı.", 404, "nouser");
  if (u && u.role === "yonetici" && adminCount(f) <= 1) throw new PanelError("Son yönetici kaldırılamaz. Önce başka birini yönetici yapın.", 400, "lastadmin");
  const rotate = { since: f.rotate?.since || nowIso(), removed: [...new Set([...(f.rotate?.removed || []), em])] };
  return { ...f, users: f.users.filter((x) => x !== u), legacy: f.legacy.filter((x) => x !== lu), rotate };
}
/**
 * Anahtar yenileme: yeni K', kasa yeni GitHub anahtarıyla K' altında; K' kalan herkesin pub'ına sarılır.
 * Şifre gerekmez. Eski kayıtlar (legacy) eski anahtarı taşıdığı için silinir. {file, k}
 */
export async function rotateKey(f, payload, kB64) {
  if (!payload || !payload.token || !payload.repo) throw new PanelError("Yeni anahtar eksik.", 400, "token");
  if (!payload.talepler && kB64 && f.vault) { // talepler bağlantısı eski kasadan taşınır
    try { const old = await openVault(b64ToBytes(kB64), f.vault); if (old.talepler) payload = { ...payload, talepler: old.talepler }; } catch {}
  }
  const K = rnd(32);
  const users = [];
  for (const u of f.users) users.push({ ...u, wrap: await wrapFor(K, u.pub) });
  return { file: { v: 2, users, vault: await sealVault(K, payload), legacy: [], rotate: null }, k: bytesToB64(K) };
}

/** Oturumdaki K ile kasayı oku (ör. başka yönetici talepler bağlantısını sonradan ekledi). Açılmazsa null. */
export async function readVault(f, kB64) {
  try { const { payload } = await checkK(f, kB64); return vaultPayload(payload); } catch { return null; }
}
/** Yönetici: talepler bağlantısını ({url,key}) kasaya ekle/değiştir/kaldır (null). Aynı K ile yeniden şifrelenir; kullanıcı sarmaları değişmez. */
export async function setTalepler(f, kB64, talepler) {
  const { K, payload } = await checkK(f, kB64);
  if (talepler && (!talepUrlOk(talepler.url) || !/^[A-Za-z0-9_-]{20,200}$/.test(String(talepler.key || ""))))
    throw new PanelError("Talepler bağlantısı geçersiz.", 400, "talepler");
  const next = { ...payload }; delete next.talepler;
  if (talepler) next.talepler = { url: String(talepler.url).trim(), key: String(talepler.key) };
  return { ...f, vault: await sealVault(K, next) };
}

// ================================================================ Talepler (teklif formu → Apps Script web uygulaması)
export const DURUMLAR = ["Yeni", "Arandı", "Keşif planlandı", "Teklif verildi", "Kazanıldı", "Kaybedildi", "İptal"];
export const DURUM_GRUP = { "Yeni": "yeni", "Arandı": "devam", "Keşif planlandı": "devam", "Teklif verildi": "devam", "Kazanıldı": "kapanan", "Kaybedildi": "kapanan", "İptal": "kapanan" };
/** Apps Script web uygulaması adresi mi? (yerel test için localhost/127.0.0.1 http de kabul) */
export function talepUrlOk(url, { allowLocal = true } = {}) {
  const u = String(url || "").trim();
  if (/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(u)) return true;
  if (/^https:\/\/script\.google\.com\/a\/macros\/[a-z0-9.-]+\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(u)) return true;
  return allowLocal && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/[\w\-/]*$/.test(u);
}
/** Türkiye numarası → WhatsApp biçimi (90XXXXXXXXXX). 0532… / 532… / +90 532… / 0090… Tanınmazsa yalnız rakamlar. */
export function waNumber(tel) {
  let d = String(tel || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d[0] === "0") return "90" + d.slice(1);
  if (d.length === 10 && d[0] !== "0") return "90" + d;
  return d;
}
/** tel: bağlantısı (+90… ; tanınmazsa yazıldığı gibi rakamlar) */
export function telHref(tel) {
  const w = waNumber(tel);
  return w.length === 12 && w.startsWith("90") ? "tel:+" + w : "tel:" + String(tel || "").replace(/[^\d+]/g, "");
}
/** "Bugün 14:05" / "Dün 09:12" / "3 Kas 14:05" / "3 Kas 2025" — Türkiye saati (UTC+3) */
const AY_K = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
export function trRelTime(iso, now = Date.now()) {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return String(iso || "");
  const z = (ms) => new Date(ms + 3 * 3600e3);
  const a = z(t), b = z(typeof now === "number" ? now : now.getTime());
  const day = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = Math.round((day(b) - day(a)) / 864e5);
  const hm = String(a.getUTCHours()).padStart(2, "0") + ":" + String(a.getUTCMinutes()).padStart(2, "0");
  if (diff === 0) return "Bugün " + hm;
  if (diff === 1) return "Dün " + hm;
  const dm = a.getUTCDate() + " " + AY_K[a.getUTCMonth()];
  return a.getUTCFullYear() === b.getUTCFullYear() ? dm + " " + hm : dm + " " + a.getUTCFullYear();
}
/** Filtre + arama (ad, telefon, konum, not, iç not, mekân, kapsam, ID; Türkçe harf duyarsız; telefon 0'lı/0'sız) */
const fold = (x) => String(x || "").toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
export function filterLeads(rows, { grup = "tumu", q = "" } = {}) {
  const qq = fold(q).trim(); const qd = qq.replace(/[\s()\-+.]/g, "");
  const digitQ = /^\d{3,}$/.test(qd) ? qd.replace(/^(00)?90(?=\d{10})/, "").replace(/^0/, "") : "";
  return (rows || []).filter((r) => {
    if (grup !== "tumu" && (DURUM_GRUP[r.durum] || "yeni") !== grup) return false;
    if (!qq) return true;
    if (digitQ && waNumber(r.tel).includes(digitQ)) return true;
    return fold([r.ad, r.tel, r.eposta, r.konum, r.not, r.icnot, r.tip, r.kapsam, r.id].join(" ")).includes(qq);
  });
}
export const countNew = (rows) => (rows || []).filter((r) => (r.durum || "Yeni") === "Yeni").length;
const TALEP_ERR = { auth: "Talepler anahtarı geçersiz. Yönetici kurulumu yenilemeli.", claimed: "Bu bağlantı daha önce bir panele bağlanmış.", notfound: "Talep bulunamadı (silinmiş olabilir).", durum: "Geçersiz durum.", server: "Talepler servisi hata verdi. Biraz sonra tekrar deneyin.", bad: "Geçersiz istek." };
/** Apps Script istemcisi: JSON gövde, text/plain (CORS ön isteği yok), anahtar gövdede. */
export class Talepler {
  constructor({ url, key, fetchFn } = {}) { this.url = url; this.key = key; this.fetch = fetchFn || globalThis.fetch.bind(globalThis); }
  async call(action, extra = {}, { auth = true } = {}) {
    let r;
    try {
      r = await this.fetch(this.url, { method: "POST", cache: "no-store", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...(auth ? { key: this.key } : {}), ...extra }) });
    } catch { throw new PanelError("Talepler servisine ulaşılamıyor. İnternet bağlantınızı kontrol edin.", 0, "network"); }
    let j = null; try { j = await r.json(); } catch {}
    if (!r.ok || !j || typeof j !== "object") throw new PanelError("Bu bağlantı yanıt vermiyor veya bir VOX talepler servisi değil. Adresi kontrol edin.", r.status || 0, "notservice");
    if (!j.ok) throw new PanelError(TALEP_ERR[j.error] || "İşlem yapılamadı.", 400, j.error || "error");
    return j;
  }
  async ping() { const j = await this.call("ping", {}, { auth: false }); if (j.service !== "vox-talepler") throw new PanelError("Bu bağlantı bir VOX talepler servisi değil.", 0, "notservice"); return j; }
  async claim() { return (await this.call("claim", {}, { auth: false })).key; }
  async list() { return (await this.call("list")).rows || []; }
  async update(id, patch) { return (await this.call("update", { id, ...patch })).row; }
  async stats(days = 30) { const j = await this.call("stats", { days }); delete j.ok; return j; }
}

// ---- ziyaret özeti (Özet ekranı)
export const SOURCE_LABELS = { instagram: "Instagram", google: "Google", whatsapp: "WhatsApp", facebook: "Facebook", "diger-site": "Diğer siteler", direkt: "Doğrudan", kampanya: "Kampanya" };
const PAGE_NAMES = { "": "Ana sayfa", projeler: "Projeler", hizmetler: "Hizmetler", surec: "Süreç", hakkimizda: "Hakkımızda", sss: "SSS", iletisim: "İletişim", blog: "Blog" };
/** site yolu → okunur ad. titles: { slug: proje başlığı } */
export function pathLabel(path, titles = {}) {
  const parts = String(path || "/").split(/[?#]/)[0].split("/").filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
  if (!parts.length) return PAGE_NAMES[""];
  const [a, b] = parts;
  if (a === "projeler" && b) return titles[b] || b.replace(/-/g, " ").replace(/^./, (c) => c.toLocaleUpperCase("tr"));
  if (a === "blog" && b) return "Blog: " + b.replace(/-/g, " ");
  if (parts.length === 1 && a in PAGE_NAMES) return PAGE_NAMES[a];
  return "/" + parts.join("/") + "/";
}
/** kaynak listesi → [{s, label, visits, pct}] (yüzdeler tam sayı) */
export function sourceBars(sources = []) {
  const tot = sources.reduce((a, x) => a + (x.visits || 0), 0) || 1;
  return sources.filter((x) => x.visits > 0).map((x) => ({ s: x.s, label: SOURCE_LABELS[x.s] || x.s, visits: x.visits, pct: Math.round((x.visits / tot) * 100) }));
}
/** "2026-11-05" → "5 Kas" */
export function shortDay(key) { const [, m, d] = String(key).split("-").map(Number); return `${d} ${TR_MON[m - 1] || ""}`; }
const TR_MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];


// ---- şifre gücü + okunabilir geçici şifre
const WORDS = ("masa kalem deniz bulut orman nehir tepe vadi kum ada liman gemi yelken rota harita pusula kitap defter silgi cetvel kare kemer kolon duvar tavan zemin " +
  "merdiven balkon salon mutfak banyo koltuk sehpa lamba perde ayna raf dolap kapak sandalye yatak taban tuval boya renk mavi siyah beyaz mor lacivert bordo " +
  "krem bej toprak kahve zeytin limon nane elma armut kiraz erik ayva incir nar kavun karpuz ceviz badem biber yaprak cam mermer beton tahta demir elmas yakut " +
  "inci mercan zambak lale papatya nergis orkide sedir kavak servi palmiye meltem poyraz lodos kar sis gezegen sahil kaya dalga koy burun ufuk ege marmara " +
  "bodrum alanya mardin kars rize sinop bursa izmir adana konya edirne trabzon artvin bolu ordu manisa sivas tokat amasya kayseri urfa hatay kilis ankara kalkan " +
  "side patara efes truva likya nemrut zeugma sardes harran ahlat olimpos assos didim milet priene kemik pamuk keten ipek kadife saten tirtil yay ok kanat tuy " +
  "martin kartal atmaca serce baykus leylek turna flamingo yunus balina fok penguen panda zebra kanguru tavus papagan kumru " +
  "bardak fincan demlik tepsi sepet kutu anahtar kilit zil saat takvim piyano keman gitar davul nota ritim melodi bahar nisan haziran temmuz ekim " +
  "ocak atlas sirius vega orion kanyon volkan buzul vaha serap ahenk denge nokta prizma kubbe minare avlu revak eyvan sofa cumba kiler ambar konak").split(/\s+/).filter((w) => /^[a-z]+$/.test(w));
export const PASS_WORDS = [...new Set(WORDS)];
function rndInt(n) { // tarafsız
  const lim = Math.floor(0x100000000 / n) * n; let x;
  do { x = globalThis.crypto.getRandomValues(new Uint32Array(1))[0]; } while (x >= lim);
  return x % n;
}
/** ör. "lodos-mermer-kiraz-efes-nane-47" (5 kelime + 2 rakam ≈ 44 bit) */
export function makePassphrase(words = 5) {
  return [...Array.from({ length: words }, () => PASS_WORDS[rndInt(PASS_WORDS.length)]), String(10 + rndInt(90))].join("-");
}
/** {score 0–4, label} — kaba tahmin; 12 karakterden kısa = 0 */
export function passwordStrength(pw) {
  const s = String(pw || ""); const n = [...s].length;
  if (!n) return { score: 0, label: "" };
  if (n < MIN_PASS) return { score: 0, label: `Çok kısa — en az ${MIN_PASS} karakter (${n}/${MIN_PASS})` };
  let score = 1;
  if (n >= 16) score++;
  if (n >= 22) score++;
  const classes = [/[a-zçğıöşü]/, /[A-ZÇĞİÖŞÜ]/, /\d/, /[^\p{L}\p{N}]/u].filter((r) => r.test(s)).length;
  const words = s.split(/[\s\-_.]+/).filter((w) => w.length >= 3).length;
  if (classes >= 3 || words >= 4) score++;
  if (/(.)\1{3,}/.test(s) || /(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf|sifre|şifre|password|parola|vox|mimarlik)/i.test(s)) score = Math.max(1, score - 2);
  score = Math.min(4, score);
  return { score, label: ["Çok kısa", "Zayıf", "Orta", "İyi", "Güçlü"][score] };
}

// ---- yol izin listesi
const WRITE_ROOTS = ["content/", "src/uploads/"];
const READ_EXTRA = ["src/img/manifest.json"];
export function checkPath(path, { read = false, dir = false } = {}) {
  const p = String(path || "");
  const bad = !p || p.startsWith("/") || p.includes("\\") || p.includes("\0") || /^[a-zA-Z]:/.test(p) ||
    p.split("/").some((s) => s === ".." || s === "." || (s === "" && !dir));
  if (bad) throw new PanelError("Bu dosya yolu panelde kullanılamaz.", 400, "path");
  const q = dir ? p.replace(/\/?$/, "/") : p;
  const ok = WRITE_ROOTS.some((r) => q.startsWith(r)) || (read && READ_EXTRA.includes(p));
  if (!ok) throw new PanelError("Bu dosya yolu panelde kullanılamaz.", 400, "path");
  return p;
}

// ---- adres (slug) üretimi: Türkçe harfleri sadeleştirir
const TR = { ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i", ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u", â: "a", Â: "a", î: "i", Î: "i", û: "u", Û: "u" };
export function slugify(t, max = 80) {
  let s = String(t || "").replace(/[çÇğĞıIİöÖşŞüÜâÂîÎûÛ]/g, (c) => TR[c]).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  s = s.replace(/&/g, "-ve-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (s.length > max) s = s.slice(0, max).replace(/-+[^-]*$/, "") || s.slice(0, max);
  return s.replace(/-+$/, "");
}

// ---- JSON: mevcut dosyalarla aynı biçim (2 boşluk, sonda satır sonu, anahtar sırası korunur)
export const toJSON = (o) => JSON.stringify(o, null, 2) + "\n";

// ---- blog ön bilgisi (frontmatter)
export function parseFrontmatter(text) {
  text = String(text).replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const meta = []; // [[anahtar, değer]] — sıra korunur
  if (!text.startsWith("---\n")) return { meta, body: text };
  const end = text.indexOf("\n---", 4);
  if (end < 0) return { meta, body: text };
  for (const line of text.slice(4, end).split("\n")) {
    if (/^\s/.test(line) && meta.length && line.trim()) { // katlanmış değer devamı
      const last = meta[meta.length - 1]; last[1] = (String(last[1]) + " " + line.trim()).trim(); continue;
    }
    if (!line.trim() || line.trimStart().startsWith("#") || !line.includes(":")) continue;
    const i = line.indexOf(":");
    const k = line.slice(0, i).trim(); let v = line.slice(i + 1).trim();
    if (v.length >= 2 && v[0] === '"' && v.at(-1) === '"') {
      try { v = JSON.parse(v); } catch { v = v.slice(1, -1).replace(/\\"/g, '"'); }
    } else if (v.length >= 2 && v[0] === "'" && v.at(-1) === "'") v = v.slice(1, -1).replace(/''/g, "'");
    else if (/^(true|evet|yes)$/i.test(v)) v = true;
    else if (/^(false|hayir|hayır|no)$/i.test(v)) v = false;
    meta.push([k, v]);
  }
  return { meta, body: text.slice(end + 4).replace(/^[^\n]*\n/, "").replace(/^\n+/, "") };
}
export function metaGet(meta, k, d = "") { const e = meta.find((x) => x[0] === k); return e ? e[1] : d; }
export function metaSet(meta, k, v) { const e = meta.find((x) => x[0] === k); if (e) e[1] = v; else meta.push([k, v]); }
/** Güvenli YAML: metinler JSON çift tırnaklı (YAML'ın alt kümesi), tarih ve evet/hayır çıplak. */
export function serializeFrontmatter(meta, body) {
  const lines = meta.map(([k, v]) => {
    if (typeof v === "boolean") return `${k}: ${v}`;
    if (typeof v === "number") return `${k}: ${v}`;
    if (k === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return `${k}: ${v}`;
    return `${k}: ${JSON.stringify(String(v ?? "").replace(/\s*\n\s*/g, " ").trim())}`; // tek satır (yedek ayrıştırıcı da okusun)
  });
  let b = String(body || "").replace(/\r\n/g, "\n").replace(/^\n+/, "");
  if (!b.endsWith("\n")) b += "\n";
  return `---\n${lines.join("\n")}\n---\n${b}`;
}

// ---- Markdown (tools/build.py ile aynı alt küme)
export const escapeHtml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
export function mdInline(t, img = (u) => u) {
  t = escapeHtml(t);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${img(u)}" alt="${a}" loading="lazy">`);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, u) => `<a href="${u}"${u.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${a}</a>`);
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(?<![\p{L}\p{N}_*])\*(?!\s)(.+?)(?<!\s)\*(?![\p{L}\p{N}_*])/gu, "<em>$1</em>");
  return t;
}
export function markdown(src, img) {
  const out = []; let para = [], lst = null, quote = [];
  const flush = () => {
    if (para.length) {
      const txt = para.join(" ");
      out.push(/^!\[[^\]]*\]\([^)\s]+\)$/.test(txt) ? `<figure>${mdInline(txt, img)}</figure>` : `<p>${mdInline(txt, img)}</p>`);
      para = [];
    }
    if (lst) { out.push(`<${lst[0]}>` + lst[1].map((x) => `<li>${mdInline(x, img)}</li>`).join("") + `</${lst[0]}>`); lst = null; }
    if (quote.length) { out.push("<blockquote>" + markdown(quote.join("\n"), img) + "</blockquote>"); quote = []; }
  };
  for (const raw of String(src).replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    let m = line.match(/^(#{1,4})\s+(.*)$/);
    if (m) { flush(); const lv = Math.min(Math.max(m[1].length, 2), 4); out.push(`<h${lv}>${mdInline(m[2], img)}</h${lv}>`); continue; }
    if (line.startsWith(">")) { if (para.length || lst) flush(); quote.push(line.slice(1).trimStart()); continue; }
    m = line.match(/^([-*+]|\d+[.)])\s+(.*)$/);
    if (m) {
      const tag = /\d/.test(m[1][0]) ? "ol" : "ul";
      if (para.length || quote.length || (lst && lst[0] !== tag)) flush();
      if (!lst) lst = [tag, []];
      lst[1].push(m[2]); continue;
    }
    if (lst && /^[ \t]/.test(raw)) { lst[1][lst[1].length - 1] += " " + line; continue; }
    if (lst || quote.length) flush();
    para.push(line);
  }
  flush();
  return out.join("\n");
}

// ---- yükleme dosya adı: src/uploads/<yyyymm>-<ad>.jpg (çakışırsa -2, -3…)
export function uploadName(filename, taken, now = new Date()) {
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const base = slugify(String(filename || "").replace(/\.[^.]+$/, ""), 50) || "foto";
  let name = `${ym}-${base}.jpg`, i = 2;
  while (taken.has(name)) name = `${ym}-${base}-${i++}.jpg`;
  taken.add(name);
  return name;
}

// ---- hata
export class PanelError extends Error {
  constructor(msg, status = 0, code = "") { super(msg); this.status = status; this.code = code; }
}

// ---- GitHub istemcisi (yalnız api.github.com; tarayıcıdan doğrudan, CORS destekli)
export class GitHub {
  constructor({ token, repo, branch = "main", name = "", email = "", fetchFn } = {}) {
    Object.assign(this, { token, repo, branch, name, email });
    this.fetch = fetchFn || globalThis.fetch.bind(globalThis);
    this.onAuthError = null;
  }
  async req(method, path, body, { accept, raw } = {}) {
    let r;
    try {
      r = await this.fetch("https://api.github.com" + path, {
        method, cache: "no-store",
        headers: { Authorization: `Bearer ${this.token}`, Accept: accept || "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch { throw new PanelError("GitHub'a ulaşılamıyor. İnternet bağlantınızı kontrol edin.", 0, "network"); }
    if (r.status === 401) { this.onAuthError && this.onAuthError(); throw new PanelError("Erişim anahtarı geçersiz. Lütfen yeniden giriş yapın.", 401, "auth"); }
    if (!r.ok) {
      let detail = ""; try { detail = (await r.json()).message || ""; } catch {}
      const msg = r.status === 403 && /rate limit/i.test(detail) ? "Çok fazla istek yapıldı. Birkaç dakika sonra tekrar deneyin."
        : r.status === 403 ? "Bu işlem için yetki yok." : r.status === 404 ? "Bulunamadı." : r.status === 409 || r.status === 422 ? "Çakışma" : "GitHub hatası (" + r.status + ")";
      throw new PanelError(msg, r.status, detail);
    }
    if (raw) return r.blob();
    return r.status === 204 ? null : r.json();
  }
  get base() { return `/repos/${this.repo}`; }
  enc(p) { return p.split("/").map(encodeURIComponent).join("/"); }
  async verify() { return this.req("GET", this.base); }
  async list(dir) {
    checkPath(dir, { dir: true });
    try {
      const a = await this.req("GET", `${this.base}/contents/${this.enc(dir.replace(/\/$/, ""))}?ref=${encodeURIComponent(this.branch)}`);
      return (Array.isArray(a) ? a : []).filter((x) => x.type === "file").map((x) => ({ name: x.name, path: x.path, sha: x.sha }));
    } catch (e) { if (e.status === 404) return []; throw e; }
  }
  async read(path, ref) {
    checkPath(path, { read: true });
    const j = await this.req("GET", `${this.base}/contents/${this.enc(path)}?ref=${encodeURIComponent(ref || this.branch)}`);
    if (Array.isArray(j) || j.type !== "file") throw new PanelError("Dosya değil.", 400);
    let content = j.content;
    if (!content && j.git_url) content = (await this.req("GET", `${this.base}/git/blobs/${j.sha}`)).content;
    return { content: b64ToUtf8(content || ""), sha: j.sha };
  }
  async readBlobUrl(path) { // özel depo görseli -> nesne URL'si
    checkPath(path, { read: true });
    const b = await this.req("GET", `${this.base}/contents/${this.enc(path)}?ref=${encodeURIComponent(this.branch)}`, null, { accept: "application/vnd.github.raw", raw: true });
    return URL.createObjectURL(b);
  }
  async createBlob(b64) {
    if (b64.length * 3 / 4 > MAX_UPLOAD) throw new PanelError("Fotoğraf çok büyük (en fazla 8 MB).", 413);
    return (await this.req("POST", `${this.base}/git/blobs`, { content: b64, encoding: "base64" })).sha;
  }
  async fileShaAt(path, ref) {
    try { const j = await this.req("GET", `${this.base}/contents/${this.enc(path)}?ref=${ref}`); return Array.isArray(j) ? "dir" : j.sha; }
    catch (e) { if (e.status === 404) return null; throw e; }
  }
  /**
   * Tek commit ile birden çok dosya: [{path, content?(metin), blobSha?, delete?, expectSha?}]
   * expectSha: undefined = kontrol yok, null = dosya olmamalı, "sha" = değişmemiş olmalı.
   * Dönüş: {commit, shas:{path: yeniSha}}
   */
  async commit(changes, message) {
    for (const c of changes) checkPath(c.path);
    return commitRaw(this, changes, message);
  }
  /** Kullanıcı dosyası (src/panel/users.json) — yalnız kullanıcı yönetimi kullanır. {json|null, sha|null} */
  async readUsers() {
    try {
      const j = await this.req("GET", `${this.base}/contents/${USERS_PATH}?ref=${encodeURIComponent(this.branch)}`);
      let content = j.content;
      if (!content && j.sha) content = (await this.req("GET", `${this.base}/git/blobs/${j.sha}`)).content;
      return { json: JSON.parse(b64ToUtf8(content || "") || "null"), sha: j.sha };
    } catch (e) { if (e.status === 404) return { json: null, sha: null }; throw e; }
  }
  /** Kullanıcı dosyasını yaz (yalnız USERS_PATH; sha kontrollü). Çakışmada 'Başka bir yerden değişti, yenileyin.' */
  async writeUsers(text, expectSha, message = "Panel: kullanıcı dosyası güncellendi") {
    JSON.parse(text); // bozuk dosya yazılmaz
    try { return await commitRaw(this, [{ path: USERS_PATH, content: text, expectSha: expectSha ?? null }], message); }
    catch (e) {
      if (e.code === "conflict" || e.code === "exists") throw new PanelError("Başka bir yerden değişti, yenileyin.", 409, "conflict");
      throw e;
    }
  }
  /** Son "Siteyi yayınla" çalışması (yalnız bu dal) */
  async status() {
    const j = await this.req("GET", `${this.base}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=5&branch=${encodeURIComponent(this.branch)}`);
    return (j.workflow_runs || []).map((r) => ({ status: r.status, conclusion: r.conclusion, created_at: r.created_at, updated_at: r.updated_at, head_sha: r.head_sha, label: statusLabel(r) }));
  }
}
/** Yol kontrolü YAPMAZ — yalnız GitHub.commit (izin listesi sonrası) ve GitHub.writeUsers (sabit yol) çağırır. Dışa açık değil. */
async function commitRaw(gh, changes, message) {
  const shas = {};
  for (const c of changes) if (!c.delete && c.content != null) {
    shas[c.path] = (await gh.req("POST", `${gh.base}/git/blobs`, { content: utf8ToB64(c.content), encoding: "base64" })).sha;
  } else if (c.blobSha) shas[c.path] = c.blobSha;
  const who = { name: gh.name || "VOX Panel", email: gh.email || "panel@voxmimarlik.com" };
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await gh.req("GET", `${gh.base}/git/ref/heads/${encodeURIComponent(gh.branch)}`);
    const head = ref.object.sha;
    for (const c of changes) if (c.expectSha !== undefined) {
      const cur = await gh.fileShaAt(c.path, head);
      if (cur !== c.expectSha) {
        if (c.expectSha === null) throw new PanelError("Bu adreste zaten bir içerik var. Başka bir adres seçin.", 409, "exists");
        throw new PanelError("Bu içerik başka bir yerden değişti, sayfayı yenileyin.", 409, "conflict");
      }
    }
    const baseTree = (await gh.req("GET", `${gh.base}/git/commits/${head}`)).tree.sha;
    const tree = await gh.req("POST", `${gh.base}/git/trees`, {
      base_tree: baseTree,
      tree: changes.map((c) => ({ path: c.path, mode: "100644", type: "blob", sha: c.delete ? null : shas[c.path] })),
    });
    const cm = await gh.req("POST", `${gh.base}/git/commits`, { message, tree: tree.sha, parents: [head], author: who, committer: who });
    try {
      await gh.req("PATCH", `${gh.base}/git/refs/heads/${encodeURIComponent(gh.branch)}`, { sha: cm.sha, force: false });
      return { commit: cm.sha, shas };
    } catch (e) { if (e.status !== 422 && e.status !== 409) throw e; } // dal ilerledi: tekrar dene
  }
  throw new PanelError("Kaydedilemedi, lütfen tekrar deneyin.", 409);
}
export function statusLabel(r) {
  if (!r) return "";
  if (r.status !== "completed") return "Yayınlanıyor…";
  if (r.conclusion === "success") return "Yayında";
  if (r.conclusion === "cancelled" || r.conclusion === "skipped") return "Yayınlanıyor…";
  return "Hata";
}

// ---- tarih
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export function trDate(d) {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${AYLAR[+m[2] - 1]} ${m[1]}` : String(d || "");
}
export function today() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}
