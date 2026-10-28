import 'server-only';
import { uploadsConfig } from "@/config/uploads";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const dir = path.resolve(uploadsConfig.dir);

export function uploadPath(file: string){
  return path.join(dir, path.basename(file));
}

export async function writeUpload(file: string, data: Buffer){
  await mkdir(dir, { recursive: true });
  await writeFile(uploadPath(file), data);
}

/*
  Стирание после транзакции: упало — останется мусор на диске, но не битая ссылка в посте
*/
export async function removeUploads(key: string, sizes: readonly number[]){
  await Promise.all(sizes.map(size => rm(uploadPath(`${key}-${size}.webp`), { force: true }).catch(() => {})));
}
