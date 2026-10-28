import { better, defineQueue, type Logger, type Queue } from "plainjob";
import Database from "better-sqlite3";

/*
  Без 'server-only': файл импортирует queue-runner.ts, который запускается голым node,
  а там 'server-only' бросает исключение. Поэтому и импорты здесь только из пакетов.
*/

const moduleGlobalThis = globalThis as unknown as { queue: Queue };

export const queueNiceLogger: Logger = {
  error(){  },
  warn(){  },
  info(){  },
  debug(){  },
}

// на всякий случай, если внутри библиотеки номрально clearInterval, то это перестраховка при hmr
/*
  похоже там реально ставится интервал при defineQueue всегда, даже если
  мы не хотим слушать очередь, а тупо хотим вызывать add
  библиотеку на рефакторинг CLAUDE CODE !! :))
*/
export const queue = moduleGlobalThis.queue ??= defineQueue({ 
  connection: better(new Database("storage/data.db")),
  logger: queueNiceLogger
});

// лучше сделать свой класс насладник или переопределить d.ts или просто написать библиотеку получше
export function sendToQueue<T extends keyof QUEUE_SCHEMA>(
  key: T, 
  obj: QUEUE_SCHEMA[T],
  options?: Parameters<Queue['add']>[2] 
){
  queue.add(key, obj, options);
}

export type QUEUE_SCHEMA = {
  'auth.send-verification-email': { email: string, url: string },
  /* письмо с готовым текстом: сброс пароля, уведомления */
  'mail.send': { to: string, subject: string, text: string }
}