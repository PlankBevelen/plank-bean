import { aiConfig } from '../../config'
import { createOpenAICompatibleProvider } from './providers/openai-compatible'
import { createUnconfiguredProvider } from './providers/unconfigured'
import type { AIProvider } from './types'

export function createAIProvider(): AIProvider {
  const context = {
    config: aiConfig,
  }

  if (
    (aiConfig.provider === 'openai-compatible' || aiConfig.provider === 'volcengine-ark') &&
    aiConfig.apiBaseUrl &&
    aiConfig.apiKey
  ) {
    return createOpenAICompatibleProvider(context)
  }

  return createUnconfiguredProvider(context)
}

export const aiProvider = createAIProvider()
