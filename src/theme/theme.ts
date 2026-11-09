// Только клиент: в серверном модуле компоненты Mantine — client references,
// у них нет `.extend`, и createTheme падает.
import 'client-only'
import {
  Badge,
  Button,
  Card,
  createTheme,
  Input,
  InputWrapper,
  MultiSelect,
  NumberInput,
  Paper,
  PasswordInput,
  SegmentedControl,
  Select,
  Textarea,
  TextInput,
  type MantineColorsTuple,
} from '@mantine/core'

/**
 * Тема Mantine: цвета, шрифты и скругления, две схемы — светлая и тёмная.
 * Макет — Pencil, спека 30 (`docs/specs/30-redesign.md`).
 *
 * Тёплая и дружелюбная: белый фон, почти чёрный текст с фиолетовым оттенком,
 * коралловый акцент действий. Солнечный, мятный и фиолетовый — для типов постов
 * и рубрик. Тёмная схема — тёмно-фиолетовые поверхности и те же акценты чуть
 * ярче. Акцент в обеих схемах один (coral), меняется только оттенок:
 * `primaryShade` 5 на светлом, 4 на тёмном.
 *
 * CSS-переменные для ручной вёрстки лежат в ./tokens.css и указывают на ту же
 * палитру, чтобы Mantine и ручной CSS не расходились.
 */

// Коралл — акцент действий. 5 — светлая схема, 4 — тёмная, 7 — текст на белом.
const coral: MantineColorsTuple = [
  '#fff0ec',
  '#ffe7e1',
  '#ffc9bd',
  '#fba493',
  '#f26a52',
  '#e8553d',
  '#d4462f',
  '#c23e28',
  '#9c3120',
  '#762517',
]

// Солнце — «Выбор редакции», звёзды оценок, счётчики. Текст на нём всегда тёмный.
const sun: MantineColorsTuple = [
  '#fffaeb',
  '#fff3d1',
  '#ffe6a3',
  '#ffd770',
  '#ffcb4f',
  '#ffc23d',
  '#e8a923',
  '#c48a12',
  '#9c6c0b',
  '#765107',
]

// Мята — успешные состояния и путешествия.
const mint: MantineColorsTuple = [
  '#eefaf7',
  '#ddf4ee',
  '#b4e7d9',
  '#86d8c2',
  '#3cc2a2',
  '#24ad90',
  '#1f9e84',
  '#18806b',
  '#126353',
  '#0c463b',
]

// Фиолетовый — ссылки, фокус и переводы.
const plum: MantineColorsTuple = [
  '#f5f2ff',
  '#ece7ff',
  '#d4caff',
  '#b6a6fb',
  '#9781f5',
  '#7a60e6',
  '#5b3fd1',
  '#4b32b0',
  '#3b278c',
  '#2b1c66',
]

// Красный — ошибки и деструктивные действия. Холоднее коралла, чтобы не путать с акцентом.
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

// Серые — холодные, от фона карточек к тексту. `c="dimmed"` в тон тексту.
const slate: MantineColorsTuple = [
  '#f7f7fa',
  '#f4f5f8',
  '#e4e5eb',
  '#c9c7d1',
  '#a9a6b4',
  '#8e8a99',
  '#5c5868',
  '#45414f',
  '#2e2a38',
  '#231f2e',
]

// Поверхности тёмной схемы (Mantine `dark`): 0 — текст, 2 — dimmed,
// 4 — граница, 6 — поверхность, 7 — фон страницы.
const night: MantineColorsTuple = [
  '#f3f0f7',
  '#d5d1dd',
  '#b7b2c3',
  '#857f93',
  '#2f2b3a',
  '#27232f',
  '#211e2a',
  '#15131b',
  '#100e15',
  '#0a090d',
]

export const theme = createTheme({
  primaryColor: 'coral',
  primaryShade: { light: 5, dark: 4 },
  autoContrast: true,
  white: '#ffffff',
  black: '#231f2e',
  colors: {
    coral,
    sun,
    mint,
    plum,
    rose,
    gray: slate,
    dark: night,
    green: mint,
    red: rose,
    blue: plum,
    yellow: sun,
    orange: coral,
  },
  // Кнопки и чипы — пилюли, поля — мягкие, карточки — крупное скругление.
  defaultRadius: 'md',
  radius: { xs: '4px', sm: '8px', md: '12px', lg: '20px', xl: '999px' },
  // Сами стеки шрифтов — в tokens.css, здесь только ссылки на них.
  fontFamily: 'var(--font-body)',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  headings: {
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.6rem', lineHeight: '1.1', fontWeight: '700' },
      h2: { fontSize: '1.85rem', lineHeight: '1.18', fontWeight: '700' },
      h3: { fontSize: '1.3rem', lineHeight: '1.25', fontWeight: '600' },
      h4: { fontSize: '1.05rem', lineHeight: '1.3', fontWeight: '600' },
    },
  },
  components: {
    // md — главное действие страницы кабинета (макет: 42px, текст 15px; у Mantine md — 16px)
    Button: Button.extend({
      defaultProps: { radius: 'xl' },
      vars: (_theme, props) => props.size === 'md' ? { root: { '--button-fz': '0.9375rem' } } : { root: {} },
      styles: {
        root: {
          fontWeight: 600,
        },
      },
    }),
    Badge: Badge.extend({
      defaultProps: { radius: 'xl' },
      styles: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: { radius: 'xl' },
    }),
    Card: Card.extend({
      defaultProps: { radius: 'lg', bg: 'var(--surface)' },
    }),
    Paper: Paper.extend({
      defaultProps: { radius: 'lg', bg: 'var(--surface)' },
    }),

    // Поля мягкие; подписи — обычный регистр, полужирные, приглушённые.
    Input: Input.extend({
      styles: {
        input: {
          backgroundColor: 'var(--field)',
          borderColor: 'var(--input-line)',
        },
      },
    }),
    InputWrapper: InputWrapper.extend({
      styles: {
        label: {
          fontFamily: 'var(--font-label)',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: 'var(--ink-soft)',
          marginBottom: 6,
        },
      },
    }),
    TextInput: TextInput.extend({ defaultProps: { size: 'md', radius: 'md' } }),
    PasswordInput: PasswordInput.extend({ defaultProps: { size: 'md', radius: 'md' } }),
    Textarea: Textarea.extend({ defaultProps: { size: 'md', radius: 'md' } }),
    Select: Select.extend({ defaultProps: { size: 'md', radius: 'md' } }),
    MultiSelect: MultiSelect.extend({ defaultProps: { size: 'md', radius: 'md' } }),
    NumberInput: NumberInput.extend({ defaultProps: { size: 'md', radius: 'md' } }),
  },
})
