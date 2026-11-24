/*
  Кэш в памяти с ограничением числа записей и временем жизни. Порядок Map — порядок
  обращений: get переставляет ключ в конец, переполнение вытесняет самый старый (LRU)
*/
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V, expiresAt: number }>();

  constructor(private readonly options: { max: number, ttlMs: number }){}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);

    if(!entry){
      return undefined;
    }

    this.entries.delete(key);

    if(entry.expiresAt <= Date.now()){
      return undefined;
    }

    this.entries.set(key, entry);

    return entry.value;
  }

  set(key: string, value: V){
    this.entries.delete(key);

    if(this.entries.size >= this.options.max){
      const oldest = this.entries.keys().next();

      if(!oldest.done){
        this.entries.delete(oldest.value);
      }
    }

    this.entries.set(key, { value, expiresAt: Date.now() + this.options.ttlMs });
  }
}
