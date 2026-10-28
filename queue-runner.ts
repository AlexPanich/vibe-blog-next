import { defineWorker } from "plainjob";
import { queue, queueNiceLogger, type QUEUE_SCHEMA } from "./src/globals/queue.ts";

const verificationWorker = defineWorker(
  'auth.send-verification-email',
  async function({ data }){
    const payload = JSON.parse(data) as QUEUE_SCHEMA['auth.send-verification-email'];
    
    console.log('start auth.send-verification-email');
    await new Promise(r => setTimeout(r, 3000))
    console.log('end auth.send-verification-email', payload);
  },
  { queue, logger: queueNiceLogger }
)

const mailWorker = defineWorker(
  'mail.send',
  async function({ data }){
    const payload = JSON.parse(data) as QUEUE_SCHEMA['mail.send'];

    console.log(`mail to ${payload.to}: ${payload.subject}\n${payload.text}\n`);
  },
  { queue, logger: queueNiceLogger }
)

let shuttingDown = false;

async function shutdown(){
  // повторный Ctrl+C не должен запускать stop() второй раз
  if(shuttingDown){
    return;
  }

  shuttingDown = true;
  console.log("Shutting down...");
  // типо завершаем задачи. Так оно или нет - на совести бибилиотеки
  await Promise.all([ verificationWorker.stop(), mailWorker.stop() ]);
  queue.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown); // Ctrl+C, в т.ч. на Windows

verificationWorker.start();
mailWorker.start();