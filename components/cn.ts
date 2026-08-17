import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

type CnTemplateArgs = [TemplateStringsArray, ...ClassValue[]]

const isTemplateStringsArray = (value: unknown): value is TemplateStringsArray => {
  return Array.isArray(value) && 'raw' in value
}

interface Cn {
  (...args: ClassValue[]): string
  (strings: TemplateStringsArray, ...values: ClassValue[]): string
}

const cn: Cn = (...args: [ClassValue | TemplateStringsArray, ...ClassValue[]]) => {
  if (isTemplateStringsArray(args[0])) {
    const [strings, ...values] = args as CnTemplateArgs
    const className = strings.reduce((result, part, index) => {
      const value = values[index]
      return `${result}${part}${value === undefined ? '' : clsx(value)}`
    }, '')

    return twMerge(clsx(className))
  }

  return twMerge(clsx(args))
}

export default cn
