// Generates pre-recorded Russian voice clips (mp3) so the game speaks on
// Android TV WebViews that have no TTS engine. Source: Google Translate TTS.
// Output: audio/<slug>.mp3
import { mkdir, writeFile } from "node:fs/promises";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// slug -> Russian text (must match the strings used in index.html say())
const PHRASES = {
  naydi_takoy_zhe:      "Найди такой же",
  naydi_takoy_zhe_tsvet:"Найди такой же цвет",
  chto_lishnee:         "Что лишнее?",
  chya_eto_ten:         "Чья это тень?",
  naydi_zhivotnoe:      "Найди ещё животное",
  naydi_frukt:          "Найди ещё фрукт",
  naydi_tsvetok_more:   "Найди ещё цветок",
  samy_bolshoy:         "Самый большой",
  samy_malenkiy:        "Самый маленький",
  naydi_stolko_zhe:     "Найди столько же",
  slushay_i_naydi:      "Слушай и найди",
  molodets:             "Молодец",
  otlichno:             "Отлично",
  pravilno:             "Правильно",
  umnitsa:              "Умница",
  prekrasno:            "Прекрасно",
  pochti:               "Почти",
  poprobuy:             "Попробуй ещё раз",
  novy_uroven:          "Новый уровень",
  // concept labels (must match PHOTO_DATA labels)
  most:"Мост", koshka:"Кошка", sobaka:"Собака", loshad:"Лошадь", slon:"Слон",
  lev:"Лев", medved:"Медведь", sova:"Сова", utka:"Утка", pingvin:"Пингвин",
  ryba:"Рыба", babochka:"Бабочка", tsvetok:"Цветок", derevo:"Дерево",
  yabloko:"Яблоко", gora:"Гора", zamok:"Замок", tserkov:"Церковь",
};

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const HOSTS = ["https://translate.google.com", "https://translate.googleapis.com"];

async function tts(text) {
  const q = encodeURIComponent(text);
  for (let attempt = 0; attempt < 5; attempt++) {
    const host = HOSTS[attempt % HOSTS.length];
    const url = `${host}/translate_tts?ie=UTF-8&client=tw-ob&tl=ru&q=${q}`;
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 800) return buf; // sanity: real mp3
      }
    } catch (e) {}
    await sleep(1200 * (attempt + 1));
  }
  throw new Error("tts failed: " + text);
}

await mkdir("audio", { recursive: true });
const slugs = {};
let ok = 0;
for (const [slug, text] of Object.entries(PHRASES)) {
  try {
    const buf = await tts(text);
    await writeFile(`audio/${slug}.mp3`, buf);
    slugs[text] = slug;
    ok++;
    console.log(`OK  audio/${slug}.mp3  (${Math.round(buf.length/1024)} KB)  "${text}"`);
  } catch (e) {
    console.log("FAIL " + slug + " : " + e.message);
  }
  await sleep(400);
}
// text -> slug map for the game
await writeFile("audio/voices.js", "window.VOICES = " + JSON.stringify(slugs, null, 1) + ";\n");
console.log(`\nWrote audio/voices.js with ${ok}/${Object.keys(PHRASES).length} clips.`);
