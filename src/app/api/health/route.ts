import { db } from "@/globals/db";
import { sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';

// Проверка живости для Docker HEALTHCHECK и Render: сервер отвечает и база открывается
export function GET(){
  db.get(sql`SELECT 1`);

  return Response.json({ ok: true });
}
