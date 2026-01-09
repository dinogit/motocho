/**
 * Tauri invoke helper
 * Handles dynamic importing to ensure Tauri API is fully initialized
 */

type InvokeFunction = (command: string, args?: Record<string, unknown>) => Promise<unknown>

let cachedInvoke: InvokeFunction | null = null

/**
 * Get the Tauri invoke function, waiting if necessary
 * Retries up to 500ms to ensure Tauri is ready
 */
export async function getTauriInvoke(): Promise<InvokeFunction> {
  // Return cached version if available
  if (cachedInvoke !== null) {
    return cachedInvoke
  }

  let attempts = 0
  while (attempts < 50) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      if (typeof invoke !== 'undefined') {
        cachedInvoke = invoke as InvokeFunction
        console.log('[Tauri] invoke imported successfully')
        return invoke as InvokeFunction
      }
    } catch (e) {
      // Tauri not ready yet
    }
    await new Promise(r => setTimeout(r, 10))
    attempts++
  }

  throw new Error('Failed to load Tauri invoke after 500ms')
}
