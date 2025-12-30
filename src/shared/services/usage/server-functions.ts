import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createServerFn } from '@tanstack/react-start'

const STATSIG_DIR = path.join(os.homedir(), '.claude', 'statsig')

export interface UsageInfo {
  tokenThreshold: number | null
}

/**
 * Get usage threshold info from statsig cache
 */
export const getUsageInfo = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UsageInfo> => {
    try {
      const files = await fs.promises.readdir(STATSIG_DIR)
      const cacheFile = files.find((f) => f.startsWith('statsig.cached.evaluations'))

      if (!cacheFile) {
        return { tokenThreshold: null }
      }

      const content = await fs.promises.readFile(path.join(STATSIG_DIR, cacheFile), 'utf-8')
      const parsed = JSON.parse(content)

      // Parse the nested data string
      const data = JSON.parse(parsed.data)

      // Find the tokenThreshold in dynamic_configs
      // Key 4189951994 contains tokenThreshold based on our exploration
      const configs = data.dynamic_configs || {}
      for (const config of Object.values(configs) as any[]) {
        if (config?.value?.tokenThreshold !== undefined) {
          return {
            tokenThreshold: config.value.tokenThreshold,
          }
        }
      }

      return { tokenThreshold: null }
    } catch {
      return { tokenThreshold: null }
    }
  }
)
