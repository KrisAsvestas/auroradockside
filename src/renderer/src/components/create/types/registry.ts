export const PROJECT_TYPES = [
  { value: '', label: 'Blank PHP + Node' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'laravel', label: 'Laravel' },
  { value: 'drupal', label: 'Drupal' }
]

export function getTypeLabel(projectType: string): string {
  return PROJECT_TYPES.find((type) => type.value === projectType)?.label ?? 'project'
}
