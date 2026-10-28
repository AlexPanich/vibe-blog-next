import 'server-only';
import { notFound } from "next/navigation";

/*
  Id из url: const id = idOrFail((await params).id);

  Только каноническая запись: 1, 25, 300. Иначе +1, 001, 1e0, 1.0 открыли бы
  ту же страницу по разным url.
*/
export function idOrFail(value: string){
  const id = Number(value);

  if(!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)){
    return notFound();
  }

  return id;
}
