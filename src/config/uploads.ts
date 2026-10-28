export const uploadsConfig = {
  // Вне public/: production-сервер не отдаёт файлы, появившиеся там после сборки
  dir: './storage/uploads',
  maxBytes: 5 * 1024 * 1024,
  // Защита от «бомбы»: маленький файл с гигантским разрешением съел бы память при декодировании
  maxPixels: 40_000_000,
  postImagesPerPost: 10
}
