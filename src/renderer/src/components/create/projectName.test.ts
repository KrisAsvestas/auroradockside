import { describe, expect, it } from 'vitest'
import { isValidProjectName, slugifyProjectName } from './projectName'

describe('isValidProjectName', () => {
  it('accepts hostname-safe names', () => {
    expect(isValidProjectName('my-project')).toBe(true)
    expect(isValidProjectName('project1')).toBe(true)
  })

  it('rejects names with spaces', () => {
    expect(isValidProjectName('Aurora Admin')).toBe(false)
  })

  it('rejects names starting or ending with a hyphen', () => {
    expect(isValidProjectName('-project')).toBe(false)
    expect(isValidProjectName('project-')).toBe(false)
  })

  it('rejects empty names', () => {
    expect(isValidProjectName('')).toBe(false)
  })
})

describe('slugifyProjectName', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugifyProjectName('Aurora Admin')).toBe('aurora-admin')
  })

  it('collapses runs of non-alphanumeric characters', () => {
    expect(slugifyProjectName('My  Cool!! Project')).toBe('my-cool-project')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugifyProjectName('  -Weird Name-  ')).toBe('weird-name')
  })

  it('produces a name that passes validation', () => {
    const slug = slugifyProjectName('Aurora Admin')
    expect(isValidProjectName(slug)).toBe(true)
  })
})
