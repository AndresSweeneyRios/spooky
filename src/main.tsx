import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import './index.css';

// Preload
import { processAttributes } from "./utils/processAttributes";
processAttributes;

import type { EntId } from './simulation/EntityRegistry';
class A extends EntityView {}
new A(Symbol() as EntId);

import "./graphics/shaders";
import "./graphics/injections";
import { EntityView } from "./simulation/EntityView";

const NotFound = lazy(() => import('./pages/_notfound'));
const Landing = lazy(() => import('./pages/Landing'));
const CrazeOh = lazy(() => import('./pages/Caseoh'));
const Spooky = lazy(() => import('./pages/Spooky'));

console.log(`%cJOIN US — https://tripshred.com`, "font-weight: bold; font-size: 16px; padding: 20px; color: #FF4D4D;");

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
                  `, "font-weight: bold; font-size: 14px; color: #FFF375;");

const router = createBrowserRouter([
  // Home
  {
    path: "/",
    element: <Suspense fallback={<div></div>}><CrazeOh /></Suspense>,
  },
  {
    path: "/spooky",
    element: <Suspense fallback={<div></div>}><Spooky /></Suspense>,
  },
  {
    path: "/landing",
    element: <Suspense fallback={<div></div>}><Landing /></Suspense>,
  },
  // 404
  {
    path: "*",
    element: <Suspense fallback={<div></div>}><NotFound /></Suspense>,
  },
]);

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
  document.getElementById('root')
);
