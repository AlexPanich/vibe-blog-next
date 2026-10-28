import { UPLOAD_FILE_PATTERN } from "@/core/imageUrl";
import { uploadPath } from "@/globals/uploads";
import { readFile } from "node:fs/promises";

/*
  Загруженные файлы. Имя — только строгого вида (случайный ключ и размер): обход путей и
  чужие файлы storage/ недостижимы. Ключ меняется вместе с файлом — кэш навсегда
*/
export async function GET(_request: Request, { params }: RouteContext<'/uploads/[file]'>) {
  const { file } = await params;

  if(!UPLOAD_FILE_PATTERN.test(file)){
    return new Response('Not found', { status: 404 });
  }

  try{
    const data = await readFile(uploadPath(file));

    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' }
    });
  }
  catch{
    return new Response('Not found', { status: 404 });
  }
}
