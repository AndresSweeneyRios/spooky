import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';
import {
  createHashRouter,
  RouteObject,
  RouterProvider,
} from "react-router-dom";
import './index.css';

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

const routes: RouteObject[] = [];

// @ts-ignore
if (import.meta.env.VITE_PROJECT === 'tripshred') {
  const Home = lazy(() => import('./pages/Home'));
  const NotFound = lazy(() => import('./pages/_notfound'));

  routes.push({
    path: "/",
    element: <Suspense fallback={<div></div>}><Home /></Suspense>,
  });

  routes.push({
    path: "*",
    element: <Suspense fallback={<div></div>}><NotFound /></Suspense>,
  });
}

// @ts-ignore
if (import.meta.env.VITE_PROJECT === 'crazeoh') {
  const CrazeOh = lazy(() => import('./pages/Caseoh'));
  const Spooky = lazy(() => import('./pages/Spooky'));

  routes.push({
    path: "/",
    element: <Suspense fallback={<div></div>}><CrazeOh /></Suspense>,
  });

  routes.push({
    path: "/loh",
    element: <Suspense fallback={<div></div>}><Spooky /></Suspense>,
  });
}

// @ts-ignore
if (import.meta.env.VITE_PROJECT === 'spooky') {
  const Spooky = lazy(() => import('./pages/Spooky'));

  routes.push({
    path: "/",
    element: <Suspense fallback={<div></div>}><Spooky /></Suspense>,
  });
}

const router = createHashRouter(routes);

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <div id="debug">
    </div>
  </React.StrictMode>,
  document.getElementById('root')
);