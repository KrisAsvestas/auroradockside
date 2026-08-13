import type { AuroraStackOptions } from '@shared/types'
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useTerminalStore } from '../stores/terminalStore'
import { useStatusStore } from '../stores/statusStore'

export interface CreateProjectInput {
  directory: string
  projectName: string
  projectType: string
  docroot: string
  stack?: Partial<AuroraStackOptions>
}

export interface WordpressSetupInput {
  directory: string
  siteUrl: string
  title: string
  adminUser: string
  adminPassword: string
  adminEmail: string
  multisite: 'none' | 'subdirectory' | 'subdomain'
}

export interface DrupalSetupInput {
  directory: string
  siteName: string
  adminUser: string
  adminPassword: string
  adminEmail: string
  profile: string
}

function beginOperation(label: string): string {
  const operationId = crypto.randomUUID()
  useTerminalStore.getState().startOperation(operationId, label)
  useStatusStore.getState().begin(operationId, label)
  return operationId
}

// Only runs `Aurora config`, not `Aurora start` — the caller is expected to
// follow a successful creation with the existing useStartProject() mutation,
// reusing its own tracked operation/toast lifecycle rather than needing this
// one to juggle two unrelated command phases under a single operationId.
export function useCreateProject(): UseMutationResult<void, Error, CreateProjectInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ directory, projectName, projectType, docroot, stack }: CreateProjectInput) => {
      const operationId = beginOperation(`Create project ${projectName}`)
      await window.api.create.configure(operationId, directory, projectName, projectType, docroot, stack)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  })
}

// `Aurora config --project-type=wordpress` only scaffolds the wp-config.php
// bridge, not WordPress core itself — see create.ts in the main process for
// why this and useSetupWordpress are separate tracked operations run after
// the project has been started.
export function useDownloadWordpress(): UseMutationResult<
  void,
  Error,
  { directory: string; locale: string }
> {
  return useMutation({
    mutationFn: async ({ directory, locale }) => {
      const operationId = beginOperation('Download WordPress core')
      await window.api.create.downloadWordpress(operationId, directory, locale)
    }
  })
}

export function useSetupWordpress(): UseMutationResult<void, Error, WordpressSetupInput> {
  return useMutation({
    mutationFn: async ({
      directory,
      siteUrl,
      title,
      adminUser,
      adminPassword,
      adminEmail,
      multisite
    }) => {
      const operationId = beginOperation('Install WordPress')
      await window.api.create.setupWordpress(
        operationId,
        directory,
        siteUrl,
        title,
        adminUser,
        adminPassword,
        adminEmail,
        multisite
      )
    }
  })
}

// `Aurora config --project-type=drupal*` only scaffolds Aurora's settings.php
// bridge, not Drupal core itself — see create.ts in the main process for why
// this, useRequireDrush, and useSetupDrupal are separate tracked operations
// run after the project has been started.
export function useDownloadDrupal(): UseMutationResult<void, Error, { directory: string }> {
  return useMutation({
    mutationFn: async ({ directory }) => {
      const operationId = beginOperation('Download Drupal core')
      await window.api.create.downloadDrupal(operationId, directory)
    }
  })
}

export function useRequireDrush(): UseMutationResult<void, Error, { directory: string }> {
  return useMutation({
    mutationFn: async ({ directory }) => {
      const operationId = beginOperation('Add Drush')
      await window.api.create.requireDrush(operationId, directory)
    }
  })
}

export function useSetupDrupal(): UseMutationResult<void, Error, DrupalSetupInput> {
  return useMutation({
    mutationFn: async ({ directory, siteName, adminUser, adminPassword, adminEmail, profile }) => {
      const operationId = beginOperation('Install Drupal')
      await window.api.create.setupDrupal(
        operationId,
        directory,
        siteName,
        adminUser,
        adminPassword,
        adminEmail,
        profile
      )
    }
  })
}
