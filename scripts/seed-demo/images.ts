import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { people } from "./people.ts";
import { demoPosts } from "./posts.ts";

/*
  Картинки демо-данных: аватары (pravatar.cc) и фото постов (Wikimedia Commons, авторы и
  лицензии — photos.json). Скачиваются в кэш и режутся в webp-варианты, как загрузки
  приложения (shared/images.ts). Варианты и manifest можно собрать заранее (Docker-сборка,
  scripts/seed-images.ts) и при старте только скопировать
*/

export type SeedImage = { key: string, width: number, height: number }

export type SeedImages = {
  // ключ человека → ключ загрузки
  avatars: Record<string, string>,
  // «набор-номер» из photos.json → загрузка
  photos: Record<string, SeedImage>
}

export const SEED_IMAGES_MANIFEST = 'seed-images.json';

/*
  Скачивает (если нет в cacheDir) и режет в uploadsDir всё, что нужно демо-данным
*/
export async function buildSeedImages(uploadsDir: string, cacheDir: string): Promise<SeedImages> {
  const manifest = JSON.parse(readFileSync(new URL('./photos.json', import.meta.url), 'utf8')) as PhotoManifest;
  const images: SeedImages = { avatars: {}, photos: {} };

  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(uploadsDir, { recursive: true });

  for(const person of people){
    const file = await cached(cacheDir, `avatar-${person.key}.jpg`, manifest._avatars[person.key]);
    images.avatars[person.key] = await saveSquare(uploadsDir, file);
  }

  for(const post of demoPosts){
    for(const [ set, index ] of post.photos){
      const id = `${set}-${index}`;

      if(images.photos[id]){
        continue;
      }

      const entry = manifest[set]?.[index];

      if(!entry){
        throw new Error(`нет фото ${id} в photos.json`);
      }

      images.photos[id] = await saveVariants(uploadsDir, await cached(cacheDir, `${id}.jpg`, entry.url));
    }
  }

  return images;
}

export function writeSeedImagesManifest(dir: string, images: SeedImages){
  writeFileSync(path.join(dir, SEED_IMAGES_MANIFEST), JSON.stringify(images));
}

/*
  Готовые варианты из dir (собраны buildSeedImages + writeSeedImagesManifest) — в
  uploadsDir. Нет manifest — null
*/
export function copySeedImages(dir: string, uploadsDir: string): SeedImages | null {
  const manifestFile = path.join(dir, SEED_IMAGES_MANIFEST);

  if(!existsSync(manifestFile)){
    return null;
  }

  mkdirSync(uploadsDir, { recursive: true });

  for(const file of readdirSync(dir)){
    if(file.endsWith('.webp')){
      copyFileSync(path.join(dir, file), path.join(uploadsDir, file));
    }
  }

  return JSON.parse(readFileSync(manifestFile, 'utf8')) as SeedImages;
}

type PhotoManifest = Record<string, { url: string, author: string, license: string, source: string }[]> & { _avatars: Record<string, string> };

const IMAGE_WIDTHS = [ 1600, 800, 400 ];

const AVATAR_SIZES = [ 256, 64 ];

const ATTEMPTS = 4;

// Wikimedia отвечает 429 на частые запросы: пауза между скачиваниями и повтор с ожиданием
async function cached(cacheDir: string, name: string, url: string){
  const file = path.join(cacheDir, name);

  if(existsSync(file)){
    return file;
  }

  for(let attempt = 1; ; attempt++){
    const res = await fetch(url, { headers: { 'User-Agent': 'VibeDemoSeed/1.0 (demo data for a study project)' } });

    if(res.ok){
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      await sleep(300);

      return file;
    }

    if(attempt >= ATTEMPTS || (res.status !== 429 && res.status < 500)){
      throw new Error(`${res.status} ${url}`);
    }

    await sleep(2000 * attempt);
  }
}

// Как saveImageVariants в shared/images.ts: варианты по длинной стороне, webp 82
async function saveVariants(uploadsDir: string, file: string): Promise<SeedImage> {
  const key = randomUUID();
  const source = sharp(file).rotate();
  const meta = await source.metadata();
  const { width = 0, height = 0 } = meta.autoOrient ?? meta;

  for(const size of IMAGE_WIDTHS){
    await source.clone()
      .resize(width >= height ? { width: size, withoutEnlargement: true } : { height: size, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(uploadsDir, `${key}-${size}.webp`));
  }

  return { key, width, height };
}

// Как saveSquareVariants: квадрат по центру
async function saveSquare(uploadsDir: string, file: string){
  const key = randomUUID();

  for(const size of AVATAR_SIZES){
    await sharp(file).rotate().resize(size, size, { fit: 'cover' }).webp({ quality: 85 }).toFile(path.join(uploadsDir, `${key}-${size}.webp`));
  }

  return key;
}

function sleep(ms: number){
  return new Promise(resolve => setTimeout(resolve, ms));
}
