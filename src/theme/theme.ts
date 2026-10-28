// Только клиент: в серверном модуле компоненты Mantine — client references,
// у них нет `.extend`, и createTheme падает.
import 'client-only'
import {
  Button,
  Card,
  createTheme,
  Input,
  InputWrapper,
  MultiSelect,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  Textarea,
  TextInput,
  virtualColor,
  type MantineColorsTuple,
} from '@mantine/core'

/**
 * Тема Mantine: только цвета и шрифты, две схемы — светлая и тёмная.
 *
 * Светлая: тёплая «бумага», тёмно-синий текст, янтарный акцент, индиго для
 * ссылок и фокуса. Тёмная: почти чёрные поверхности с лёгким зелёным оттенком
 * и изумрудный акцент. Переключение акцента сделано через `virtualColor`:
 * компоненты всегда просят `amber`, а он резолвится в `sun` или `emerald`
 * в зависимости от схемы.
 *
 * CSS-переменные для ручной вёрстки лежат в ./tokens.css и указывают на ту же
 * палитру, чтобы Mantine и ручной CSS не расходились.
 */

// Янтарь — акцент светлой схемы. 5 — цвет действия, 9 — читаемый текст на бумаге.
const sun: MantineColorsTuple = [
  '#fff9ea',
  '#ffeece',
  '#ffdea4',
  '#ffd079',
  '#ffc452',
  '#ffb923',
  '#eca714',
  '#c98e14',
  '#a17214',
  '#765412',
]

// Изумруд — акцент тёмной схемы. 5 — цвет действия, 3 — текст на тёмном.
const emerald: MantineColorsTuple = [
  '#d5f0db',
  '#b3e2be',
  '#92d7a4',
  '#6ecc8a',
  '#57c37b',
  '#40b96c',
  '#33a65e',
  '#268b4d',
  '#1b6c3a',
  '#0e4e28',
]

// Индиго — ссылки и фокус.
const cobalt: MantineColorsTuple = [
  '#f0f3ff',
  '#e0e5ff',
  '#c3ccfe',
  '#a4b0f9',
  '#8792ec',
  '#6c75d5',
  '#555bb9',
  '#43479c',
  '#34377c',
  '#26295e',
]

// Зелёный — успешные / позитивные состояния.
const moss: MantineColorsTuple = [
  '#e3f4ea',
  '#c6e9d6',
  '#95d5b5',
  '#61bd92',
  '#3aa475',
  '#238c60',
  '#1c7a52',
  '#166342',
  '#104c33',
  '#0a3322',
]

// Красный — ошибки и деструктивные действия.
const rose: MantineColorsTuple = [
  '#fdeaee',
  '#fbd2da',
  '#f5a4b4',
  '#ee758f',
  '#e34e70',
  '#d43a5c',
  '#c22f4a',
  '#a3253c',
  '#821d30',
  '#5f1523',
]

// Серые от тёплой бумаги к тёмно-синему тексту — `c="dimmed"` в тон заголовкам.
const slate: MantineColorsTuple = [
  '#f7f5f1',
  '#eceef0',
  '#d6dee5',
  '#adbdc9',
  '#899dac',
  '#647c8e',
  '#436075',
  '#284a61',
  '#08324b',
  '#002135',
]

// Поверхности тёмной схемы (Mantine `dark`): 0 — текст, 2 — dimmed,
// 4 — граница, 6 — поверхность, 7 — фон страницы.
const nightfall: MantineColorsTuple = [
  '#e4e9e5',
  '#c7cec9',
  '#a7afa9',
  '#7a837d',
  '#414a44',
  '#28302b',
  '#1c221e',
  '#0d120e',
  '#060907',
  '#020403',
]

export const theme = createTheme({
  primaryColor: 'amber',
  primaryShade: 5,
  autoContrast: true,
  white: '#ffffff',
  black: '#09324b',
  colors: {
    sun,
    emerald,
    amber: virtualColor({ name: 'amber', light: 'sun', dark: 'emerald' }),
    cobalt,
    moss,
    rose,
    gray: slate,
    dark: nightfall,
    green: moss,
    red: rose,
    blue: cobalt,
  },
  // Почти квадратная геометрия: 6px у контролов, 14px у больших панелей.
  defaultRadius: 'md',
  radius: { xs: '2px', sm: '4px', md: '6px', lg: '14px', xl: '999px' },
  // Сами стеки шрифтов — в tokens.css, здесь только ссылки на них.
  fontFamily: 'var(--font-body)',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  headings: {
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.85rem', lineHeight: '1.12', fontWeight: '700' },
      h2: { fontSize: '1.95rem', lineHeight: '1.18', fontWeight: '700' },
      h3: { fontSize: '1.35rem', lineHeight: '1.25', fontWeight: '600' },
      h4: { fontSize: '1.1rem', lineHeight: '1.3', fontWeight: '600' },
    },
  },
  components: {
    Button: Button.extend({
      defaultProps: { radius: 'md' },
      styles: {
        root: {
          fontWeight: 600,
          letterSpacing: '-0.01em',
        },
      },
    }),
    Card: Card.extend({
      defaultProps: { radius: 'md', bg: 'var(--surface)' },
    }),
    Paper: Paper.extend({
      defaultProps: { radius: 'md', bg: 'var(--surface)' },
    }),

    // Поля тихие и почти квадратные; подписи — мелкие капители с разрядкой.
    Input: Input.extend({
      styles: {
        input: {
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--input-line)',
        },
      },
    }),
    InputWrapper: InputWrapper.extend({
      styles: {
        label: {
          fontFamily: 'var(--font-label)',
          fontWeight: 600,
          fontSize: '0.72rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
          marginBottom: 6,
        },
      },
    }),
    TextInput: TextInput.extend({ defaultProps: { size: 'md', radius: 'sm' } }),
    PasswordInput: PasswordInput.extend({ defaultProps: { size: 'md', radius: 'sm' } }),
    Textarea: Textarea.extend({ defaultProps: { size: 'md', radius: 'sm' } }),
    Select: Select.extend({ defaultProps: { size: 'md', radius: 'sm' } }),
    MultiSelect: MultiSelect.extend({ defaultProps: { size: 'md', radius: 'sm' } }),
    NumberInput: NumberInput.extend({ defaultProps: { size: 'md', radius: 'sm' } }),
  },
})