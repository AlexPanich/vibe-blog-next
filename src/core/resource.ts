import { input, output, ZodType } from "zod";

declare const RESOURCE: unique symbol;

export type Resource<T> = T & {
	[RESOURCE]: "You can pass to this prop only resource(...) fn result";
};

/*
  T — то, что передали (TS позволяет передать шире), U — узкий ожидаемый тип
*/
type StrictFields<T, U> = {
	[K in Exclude<keyof T, keyof U>]: never;
};

/*
  Для массивов keyof T - это number | length | map и т.п., элементы туда не входят,
  поэтому сравниваем элементы: T[number] с U[number]
*/
export type StrictResource<T, U> = Resource<T> &
	([T, U] extends [readonly (infer TE)[], readonly (infer UE)[]]
		? StrictFields<TE, UE>[]
		: StrictFields<T, U>);

export function resource<S extends ZodType>(schema: S, value: input<S>) {
	return schema.parse(value) as Resource<output<S>>;
}
