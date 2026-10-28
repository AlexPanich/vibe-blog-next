import 'server-only';
import { uploadsConfig } from "@/config/uploads";
import { removeUploads, writeUpload } from "@/globals/uploads";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export type ImageReadResult = { ok: true, buffer: Buffer } | { ok: false, error: string }

/*
  Проверка по содержимому, а не по расширению и MIME от браузера: формат определяет sharp
*/
export async function readImage(file: File): Promise<ImageReadResult> {
  if(file.size > uploadsConfig.maxBytes){
    return { ok: false, error: 'Файл больше 5 МБ' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try{
    const meta = await sharp(buffer, { limitInputPixels: uploadsConfig.maxPixels }).metadata();

    if(!meta.format || ![ 'jpeg', 'png', 'webp' ].includes(meta.format)){
      return { ok: false, error: 'Нужна картинка jpeg, png или webp' };
    }

    if((meta.width ?? 0) * (meta.height ?? 0) > uploadsConfig.maxPixels){
      return { ok: false, error: 'Слишком большое разрешение — до 40 Мп' };
    }
  }
  catch{
    return { ok: false, error: 'Нужна картинка jpeg, png или webp' };
  }

  return { ok: true, buffer };
}

/*
  Варианты по длинной стороне. rotate() применяет EXIF-ориентацию, метаданные sharp по
  умолчанию не пишет — EXIF с геометкой не уходит в публичный файл
*/
export async function saveImageVariants(buffer: Buffer, widths: readonly number[]){
  const key = randomUUID();
  const source = sharp(buffer, { limitInputPixels: uploadsConfig.maxPixels }).rotate();
  // Размеры уже с учётом EXIF-ориентации: портретное фото с телефона хранится «лёжа»
  const meta = await source.metadata();
  const { width = 0, height = 0 } = meta.autoOrient ?? meta;

  try{
    for(const size of widths){
      const data = await source.clone()
        .resize(width >= height ? { width: size, withoutEnlargement: true } : { height: size, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await writeUpload(`${key}-${size}.webp`, data);
    }
  }
  catch(e){
    await removeUploads(key, widths);
    throw e;
  }

  return { key, width, height };
}

/*
  Квадрат по центру — для аватаров
*/
export async function saveSquareVariants(buffer: Buffer, sizes: readonly number[]){
  const key = randomUUID();
  const source = sharp(buffer, { limitInputPixels: uploadsConfig.maxPixels }).rotate();

  try{
    for(const size of sizes){
      await writeUpload(`${key}-${size}.webp`, await source.clone().resize(size, size, { fit: 'cover' }).webp({ quality: 85 }).toBuffer());
    }
  }
  catch(e){
    await removeUploads(key, sizes);
    throw e;
  }

  return { key };
}
