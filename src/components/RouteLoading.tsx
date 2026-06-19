import { lazy, Suspense } from 'react'
import type { ComponentType, ReactElement } from 'react'

type ImportFunc = () => Promise<{ default: ComponentType }>

export default function lazyLoad(importFunc: ImportFunc): ReactElement {
  const LazyComponent = lazy(importFunc)

  return (
    <Suspense fallback={<RouteLoading />}>
      <LazyComponent />
    </Suspense>
  )
}

export function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1>加载中...</h1>
    </div>
  )
}
