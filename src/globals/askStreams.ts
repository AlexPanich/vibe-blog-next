import 'server-only';

/*
  Открытые потоки «Спросить блог» (спека 57, п. 17, план 57, реш. 9): один на пользователя или IP,
  ключ — u:<id> или ip:<ip>. В памяти процесса, в globalThis — переживает HMR в dev
*/
const store = globalThis as unknown as { askStreams?: Set<string> };

const streams = store.askStreams ??= new Set<string>();

export const askStreams = {
  tryAcquire(key: string){
    if(streams.has(key)){
      return false;
    }

    streams.add(key);

    return true;
  },
  release(key: string){
    streams.delete(key);
  }
}
