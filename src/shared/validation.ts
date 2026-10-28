import 'server-only';
import { db } from "@/globals/db";
import { ValidationRules, validate as runValidate } from "drizzle-validator";
import { returnValidationErrors } from "next-safe-action";
import { ZodType } from "zod";

export async function validate<B extends object>(
  schema: ZodType<B>,
  body: Partial<B>,
  rules: ValidationRules<B>
){
  const result = await runValidate(db, body, rules);

  if(!result.res){
    const out = result.errors.map(err => [ err.key, { _errors: [ err.message ] } ]);
    return returnValidationErrors(schema, Object.fromEntries(out));
  }
}
