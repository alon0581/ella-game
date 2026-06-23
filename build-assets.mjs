// Downloads clean, license-safe photos from Wikipedia for the photo modes.
// Output: photos/<concept>/<i>.jpg  +  photos/photos.js (window.PHOTO_DATA)
import { mkdir, writeFile } from "node:fs/promises";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchRetry(url, opts, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, opts);
    if (r.ok) return r;
    if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
    throw new Error(url + " -> HTTP " + r.status);
  }
  throw new Error(url + " -> still failing after retries");
}

const UA = { "User-Agent": "EllaGame/1.0 (family project)" };

const CONCEPTS = [
  { key:"bridge",   label:"Мост",     titles:["Tower_Bridge","Golden_Gate_Bridge","Rialto_Bridge"] },
  { key:"cat",      label:"Кошка",    titles:["Cat","Siamese_cat","Maine_Coon"] },
  { key:"dog",      label:"Собака",   titles:["Labrador_Retriever","Golden_Retriever","Pug"] },
  { key:"horse",    label:"Лошадь",   titles:["Horse","Arabian_horse","Friesian_horse"] },
  { key:"elephant", label:"Слон",     titles:["African_bush_elephant","Asian_elephant","Indian_elephant"] },
  { key:"lion",     label:"Лев",      titles:["Lion","Asiatic_lion","Barbary_lion"] },
  { key:"bear",     label:"Медведь",  titles:["Brown_bear","Polar_bear","American_black_bear"] },
  { key:"rabbit",   label:"Кролик",   titles:["Rabbit","European_rabbit","Domestic_rabbit"] },
  { key:"owl",      label:"Сова",     titles:["Owl","Snowy_owl","Great_horned_owl"] },
  { key:"duck",     label:"Утка",     titles:["Duck","Mallard","Muscovy_duck"] },
  { key:"penguin",  label:"Пингвин",  titles:["Penguin","Emperor_penguin","Gentoo_penguin"] },
  { key:"fish",     label:"Рыба",     titles:["Goldfish","Koi","Clownfish"] },
  { key:"butterfly",label:"Бабочка",  titles:["Butterfly","Monarch_butterfly","Papilio_machaon"] },
  { key:"flower",   label:"Цветок",   titles:["Sunflower","Tulip","Rose"] },
  { key:"tree",     label:"Дерево",   titles:["Oak","Birch","Maple"] },
  { key:"apple",    label:"Яблоко",   titles:["Apple","Granny_Smith","Gala_(apple)"] },
  { key:"mountain", label:"Гора",     titles:["Mount_Everest","Matterhorn","Mount_Fuji"] },
  { key:"castle",   label:"Замок",    titles:["Neuschwanstein_Castle","Edinburgh_Castle","Himeji_Castle"] },
  { key:"church",   label:"Церковь",  titles:["Saint_Basil's_Cathedral","Cologne_Cathedral","Notre-Dame_de_Paris"] },
];

async function imgUrl(title) {
  const r = await fetchRetry("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title), { headers: UA });
  const j = await r.json();
  const src = (j.thumbnail && j.thumbnail.source) || (j.originalimage && j.originalimage.source);
  if (!src) throw new Error(title + " -> no image");
  return src; // API thumbnail width is the only reliably hotlinkable one
}

async function download(url, path) {
  const r = await fetchRetry(url, { headers: UA });
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(path, buf);
  return buf.length;
}

const out = [];
for (const c of CONCEPTS) {
  await mkdir("photos/" + c.key, { recursive: true });
  const files = [];
  for (let i = 0; i < c.titles.length; i++) {
    try {
      const url = await imgUrl(c.titles[i]);
      const rel = "photos/" + c.key + "/" + (i + 1) + ".jpg";
      const bytes = await download(url, rel);
      files.push(rel);
      console.log("OK   " + rel + "  (" + Math.round(bytes/1024) + " KB)  <- " + c.titles[i]);
    } catch (e) {
      console.log("FAIL " + c.key + " " + c.titles[i] + " : " + e.message);
    }
    await sleep(600);
  }
  out.push({ key: c.key, label: c.label, files });
}

const ok = out.filter(c => c.files.length >= 2).length;
await writeFile("photos/photos.js", "window.PHOTO_DATA = " + JSON.stringify({ concepts: out }, null, 2) + ";\n");
console.log("\nWrote photos/photos.js — " + ok + "/" + out.length + " concepts usable (>=2 images).");
