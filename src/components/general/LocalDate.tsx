'use client';

import 'client-only';
import ClientValue from "@/components/general/ClientValue";

type LocalDateProps = {
  value: Date,
  options?: Intl.DateTimeFormatOptions,
  // «5 минут назад»: считается от часов браузера, поэтому тоже только после гидрации
  relative?: boolean
}

const RELATIVE_STEPS: [ Intl.RelativeTimeFormatUnit, number ][] = [
  [ 'second', 60 ], [ 'minute', 60 ], [ 'hour', 24 ], [ 'day', 7 ], [ 'week', 4.35 ], [ 'month', 12 ], [ 'year', Infinity ]
];

const defaultOptions: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

// До гидрации — ISO в UTC (без Intl: ICU сервера и браузера могут различаться),
// после — локаль и часовой пояс браузера.
function formatServer(value: Date, options: Intl.DateTimeFormatOptions): string {
  const iso = value.toISOString();
  const withTime = options.timeStyle !== undefined || options.hour !== undefined;

  return withTime ? `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC` : iso.slice(0, 10);
}

export default function LocalDate({ value, options = defaultOptions, relative = false }: LocalDateProps) {
  return (
    <time dateTime={value.toISOString()}>
      <ClientValue
        server={formatServer(value, options)}
        client={() => relative ? formatRelative(value) : value.toLocaleString(undefined, options)}
      />
    </time>
  );
}

function formatRelative(value: Date): string {
  let amount = (value.getTime() - Date.now()) / 1000;

  for(const [ unit, size ] of RELATIVE_STEPS){
    if(Math.abs(amount) < size){
      return Math.abs(amount) < 10 && unit === 'second'
        ? 'только что'
        : new Intl.RelativeTimeFormat('ru', { numeric: 'auto' }).format(Math.round(amount), unit);
    }

    amount /= size;
  }

  return value.toLocaleString(undefined, defaultOptions);
}
