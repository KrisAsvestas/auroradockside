import type { ForwardRefExoticComponent, RefAttributes } from 'react'

export interface TypeSetupContext {
  directory: string
  projectName: string
}

// Each project type's setup panel exposes this so the wizard can trigger
// whatever post-`Aurora config` work that type needs (downloading app core,
// running an installer, seeding a database, ...) without knowing the details.
export interface TypeSetupHandle {
  runPostCreate: (ctx: TypeSetupContext) => Promise<void>
}

export interface TypeSetupProps {
  projectName: string
  onValidityChange: (valid: boolean) => void
}

export type TypeSetupComponent = ForwardRefExoticComponent<
  TypeSetupProps & RefAttributes<TypeSetupHandle>
>
