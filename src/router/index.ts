import { createBrowserRouter } from 'react-router-dom'
import lazyLoad from '../components/RouteLoading'

const router = createBrowserRouter([
  {
    path: '/',
    element: lazyLoad(() => import('../components/layout')),
    children: [
      {
        path: '/',
        element: lazyLoad(() => import('../pages/Home')),
      },
    ],
  },
])

export default router
