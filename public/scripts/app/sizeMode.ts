'use sanity'

import { publish as _publish } from './pubsub.js'
import { bindOptionGroup as _bindOptionGroup, selectOption as _selectOption } from './optionGroup.js'

export const Imports = {
  publish: _publish,
  selectOption: _selectOption,
  bindOptionGroup: _bindOptionGroup,
}

export const SIZE_MODES = ['fitScreen', 'fitWidth', 'fitHeight', 'actualSize'] as const

export type SizeMode = (typeof SIZE_MODES)[number]

const DEFAULT_SIZE_MODE: SizeMode = 'fitScreen'
const SIZE_MODE_KEY = 'SizeMode'
const LEGACY_ORIGINAL_SIZE_KEY = 'ShowOriginalSize'
const LEGACY_ORIGINAL_SIZE_MODE: SizeMode = 'actualSize'
const SIZE_MODE_GROUP = '.selectSizeMode'

export function isSizeMode(value: unknown): value is SizeMode {
  return SIZE_MODES.some((mode) => mode === value)
}

export function getSizeMode(): SizeMode {
  const stored: unknown = window.localStorage[SIZE_MODE_KEY]
  return isSizeMode(stored) ? stored : DEFAULT_SIZE_MODE
}

function setSizeMode(mode: SizeMode): void {
  window.localStorage[SIZE_MODE_KEY] = mode
}

function adoptLegacySizePreference(): void {
  const legacy: unknown = window.localStorage[LEGACY_ORIGINAL_SIZE_KEY]
  if (legacy === undefined) return
  window.localStorage.removeItem(LEGACY_ORIGINAL_SIZE_KEY)
  if (isSizeMode(window.localStorage[SIZE_MODE_KEY])) return
  Internals.setSizeMode(legacy === 'true' ? LEGACY_ORIGINAL_SIZE_MODE : DEFAULT_SIZE_MODE)
}

function showActiveSizeOption(): void {
  Imports.selectOption(SIZE_MODE_GROUP, Internals.getSizeMode())
}

function reshapeViewerThenRefetchPicture(): void {
  Imports.publish('Pictures:SizeMode')
  Imports.publish('Pictures:Refresh')
}

export function initSizeSelector(): void {
  Internals.adoptLegacySizePreference()
  Internals.showActiveSizeOption()

  Imports.bindOptionGroup(SIZE_MODE_GROUP, (value) => {
    if (!isSizeMode(value)) return
    Internals.setSizeMode(value)
    Internals.showActiveSizeOption()
    reshapeViewerThenRefetchPicture()
  })
}

export const Internals = {
  getSizeMode,
  setSizeMode,
  showActiveSizeOption,
  adoptLegacySizePreference,
}
