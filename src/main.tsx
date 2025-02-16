import React from 'react'
import ReactDOM from 'react-dom'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom"
import './index.css'

// Preload
import { processAttributes } from "./utils/processAttributes"
processAttributes

import { EntityView } from "./simulation/EntityView"
import type { EntId } from './simulation/EntityRegistry'
class A extends EntityView {}
new A(Symbol() as EntId)

import "./graphics/shaders"
import "./graphics/injections"
import NotFound from './pages/_notfound'
import Landing from './pages/Landing'
import { CrazeOh } from "./pages/Caseoh"
import Spooky from "./pages/Spooky"

console.log(`%cJOIN US — https://tripshred.com`, "font-weight: bold; font-size: 16px; padding: 20px; color: #FF4D4D;")

console.log(`%c
              ######################             
         ##############################         
      ###################################       
    #######################################     
   ####################   ####   ###########    
  ######################        #############   
 #########################     ###############  
 ###########   ##########       ############### 
########      ##########   ###   ############## 
##########       ############################## 
#########   ##  ############################### 
############################################### 
#################################  ########### 
################################  ###########  
 #############################   ###########   
  ###################   ###    ############    
   ########                 ##############     
    ###########  ########################      
    ###################################        
     ###############################          
     #############################           
     ###  ##   #########    #####          
      #          ######       ##           
      #    #       ##         #            
           ##      #                       
           ##                              
                   #                       
                  ###                      
                  `, "font-weight: bold; font-size: 14px; color: #FFF375;")

const router = createBrowserRouter([
  // Home
  {
    path: "/",
    element: <CrazeOh />,
  },
  {
    path: "/spooky",
    element: <Spooky />,
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
