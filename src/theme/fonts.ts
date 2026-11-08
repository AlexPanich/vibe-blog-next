import { Golos_Text, Unbounded } from 'next/font/google'

// Тело и подписи. У Golos Text нет курсива: <em> будет синтетическим наклоном.
export const golos = Golos_Text({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-golos',
  display: 'swap',
})

// Заголовки. Широкий гротеск — только для коротких строк, не для текста.
export const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-unbounded',
  display: 'swap',
})

// Классы для <html>: объявляют CSS-переменные обоих шрифтов.
export const fontVariables = `${golos.variable} ${unbounded.variable}`
