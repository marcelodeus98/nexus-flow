import { describe, expect, it } from 'vitest'
import { generatePassword } from './generate-password'

describe('generatePassword', () => {
  it('mixes lower, upper, digits and symbols, without look-alike characters', () => {
    for (let i = 0; i < 200; i++) {
      const password = generatePassword()
      expect(password).toHaveLength(16)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[2-9]/)
      expect(password).toMatch(/[!@#$%&*\-_+?]/)
      expect(password).not.toMatch(/[0O1lI]/)
    }
  })

  it('does not repeat', () => {
    const passwords = new Set(Array.from({ length: 100 }, () => generatePassword()))
    expect(passwords.size).toBe(100)
  })
})
