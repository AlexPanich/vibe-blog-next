// Грубый список ботов и превью-ботов мессенджеров по User-Agent (спека 43). Пустой UA — тоже бот
const BOT_AGENT = /bot|crawl|spider|slurp|preview|fetch|curl|wget|python|headless|lighthouse|facebookexternalhit|telegram|whatsapp|vkshare/i;

export function isBotAgent(userAgent: string){
  return userAgent.trim() === '' || BOT_AGENT.test(userAgent);
}
