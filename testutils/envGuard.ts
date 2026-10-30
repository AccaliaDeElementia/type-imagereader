'use sanity'

export function snapshotProcessEnv(): () => void {
  const snapshot = { ...process.env }
  return () => {
    for (const key of Object.keys(process.env)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- process.env is the host-owned object being restored; it cannot be swapped for a Map
      if (!Object.hasOwn(snapshot, key)) delete process.env[key]
    }
    Object.assign(process.env, snapshot)
  }
}
