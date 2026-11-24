/*
  NDJSON-поток → объекты по строкам (план 57, реш. 4): ответ Ollama на сервере и ответ /api/ask
  в браузере. Пустые строки пропускаются, хвост без \n в конце тоже разбирается. Битая строка —
  исключение JSON.parse: формат потока нарушен, читать дальше нечего
*/
export async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  // stream: true — многобайтовый символ на границе кусков не ломается
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while(true){
      const { done, value } = await reader.read();

      if(done){
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let end = buffer.indexOf('\n');

      while(end !== -1){
        const line = buffer.slice(0, end).trim();

        buffer = buffer.slice(end + 1);

        if(line){
          yield JSON.parse(line);
        }

        end = buffer.indexOf('\n');
      }
    }

    const tail = (buffer + decoder.decode()).trim();

    if(tail){
      yield JSON.parse(tail);
    }
  }
  finally {
    // Ранний выход потребителя (break, исключение) отпускает поток
    reader.cancel().catch(() => {});
  }
}
