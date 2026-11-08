import { rmSync } from "node:fs";
import { buildSeedImages, writeSeedImagesManifest } from "./seed-demo/images.ts";

/*
  Картинки демо-данных заранее — для Docker-сборки: webp-варианты и manifest в каталог из
  аргумента, исходники скачиваются во временный кэш рядом и удаляются. Прод-сид потом только
  копирует их (SEED_IMAGES_DIR). Запуск: node scripts/seed-images.ts <dir>
*/

const dir = process.argv[2];

if(!dir){
  console.error('usage: node scripts/seed-images.ts <dir>');
  process.exit(1);
}

const cache = `${dir}-cache`;
const images = await buildSeedImages(dir, cache);

writeSeedImagesManifest(dir, images);
rmSync(cache, { recursive: true, force: true });

console.log(`seed images: ${Object.keys(images.avatars).length} avatars, ${Object.keys(images.photos).length} photos → ${dir}`);
