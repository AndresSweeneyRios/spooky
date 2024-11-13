import React from 'react'
import ReactDOM from 'react-dom'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom"
import './index.css'
import { Viewport } from './components/Viewport'
import { DialogueBox } from './components/DialogueBox'

const router = createBrowserRouter([
  // Home
  {
    path: "/",
    element: <>
      <Viewport />
      <DialogueBox />
    </>,
  },

  // 404
  {
    path: "*",
    element: <h1>404</h1>,
  },
])

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  document.getElementById('root')
)

import("./scenes")
