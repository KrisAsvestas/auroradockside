// Aurora project names must be valid hostname labels: alphanumeric and
// hyphens only, can't start/end with a hyphen.
const PROJECT_NAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/

export function isValidProjectName(name: string): boolean {
  return PROJECT_NAME_PATTERN.test(name)
}

export function slugifyProjectName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
