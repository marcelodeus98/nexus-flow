import { createTheme } from '@mantine/core'
import type { MantineColorsTuple } from '@mantine/core'

// Teal Nexa Assets. O tom 5 é o teal da marca (#01C1B3); o primário (7) é
// a versão escura, que mantém contraste AA com texto branco.
const brand: MantineColorsTuple = [
  '#e6faf8',
  '#c7f3ef',
  '#93e7e0',
  '#5cdbd0',
  '#2ecfc2',
  '#01c1b3',
  '#01a397',
  '#017a72',
  '#01665f',
  '#01524d',
]

// Navy da marca (#05223F) no tom 9.
const navy: MantineColorsTuple = [
  '#e7edf3',
  '#c9d5e1',
  '#9cb0c6',
  '#6e8aa8',
  '#50667f',
  '#3a5573',
  '#244364',
  '#123354',
  '#0b2a4a',
  '#05223f',
]

// Cinza puxado para o slate da marca: `dimmed`, bordas e fundos da Mantine
// ficam na mesma família da paleta.
const gray: MantineColorsTuple = [
  '#f3f6f8',
  '#e9eef2',
  '#dae1e8',
  '#c9d2dc',
  '#aab7c4',
  '#8496aa',
  '#5e7389',
  '#50667f',
  '#3a4e64',
  '#23364b',
]

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 7,
  colors: { brand, navy, gray },
  black: '#05223f',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  defaultRadius: 'md',
})
