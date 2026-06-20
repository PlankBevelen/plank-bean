import type { AIProvider, AIProviderContext } from '../types'

export function createUnconfiguredProvider(context: AIProviderContext): AIProvider {
  const providerName = context.config.provider
  const buildError = () => new Error(
    providerName === 'unconfigured'
      ? 'AI provider 未配置，请先设置 AI_PROVIDER、AI_API_BASE_URL、AI_API_KEY 或 ARK_API_KEY，以及模型参数'
      : providerName === 'volcengine-ark'
        ? '火山方舟 AI 配置不完整，请检查 ARK_API_KEY、AI_MODEL_ANALYZE 或对应 ARK_MODEL 配置'
        : `AI provider ${providerName} 配置不完整，请检查 AI_API_BASE_URL、AI_API_KEY 与模型配置`,
  )

  return {
    async analyze() {
      throw buildError()
    },
  }
}
