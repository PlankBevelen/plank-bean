import { lazy, Suspense } from 'react'
import type { ComponentType, ReactElement } from 'react'
import RouteLoading from './RouteLoading'

type ImportFunc = () => Promise<{ default: ComponentType }>

export default function lazyLoad(importFunc: ImportFunc): ReactElement {
  const LazyComponent = lazy(importFunc)

  return (
    <Suspense fallback={<RouteLoading />}>
      <LazyComponent />
    </Suspense>
  )
}
