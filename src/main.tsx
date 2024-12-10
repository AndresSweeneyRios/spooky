import React from 'react'
import ReactDOM from 'react-dom'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom"
import './index.css'
import { Viewport } from './components/Viewport'
import { DialogueBox } from './components/DialogueBox'

// Preload
import { processAttributes } from "./utils/processAttributes"
processAttributes

import { EntityView } from "./simulation/EntityView"
import type { EntId } from './simulation/EntityRegistry'
class A extends EntityView {}
new A(0 as EntId)

import "./graphics/shaders"
import "./graphics/injections"
import NotFound from './pages/_notfound'
import Home from './pages/Home'
import Landing from './pages/Landing'

const router = createBrowserRouter([
  // Home
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/landing",
    element: <Landing />,
  },
  // 404
  {
    path: "*",
    element: <NotFound />,
  },
])

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  document.getElementById('root')
)
