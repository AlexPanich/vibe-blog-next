import { Inter } from 'next/font/google'

// Курсив загружается намеренно: <em> должен быть настоящим, а не синтетическим.
export const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  style: ['normal', 'italic'],
  variable: '--font-inter',
  display: 'swap',
})
