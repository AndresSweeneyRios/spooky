import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';
import {
  createHashRouter,
  RouterProvider,
} from "react-router-dom";
import './index.css';

const NotFound = lazy(() => import('./pages/_notfound'));
const Landing = lazy(() => import('./pages/Landing'));
const CrazeOh = lazy(() => import('./pages/Caseoh'));
const Spooky = lazy(() => import('./pages/Spooky'));
const OptimizeGlb = lazy(() => import('./pages/OptimizeGlb'));
const Home = lazy(() => import('./pages/Home'));
const SizeChecker = lazy(() => import('./pages/SizeChecker'));

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

const router = createHashRouter([
  // Home
  {
    path: "/",
    element: <Suspense fallback={<div></div>}><Home /></Suspense>,
  },
  {
    path: "/crazeoh",
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
  {
    path: "/optimize-glb",
    element: <Suspense fallback={<div></div>}><OptimizeGlb /></Suspense>,
  },

  {
    path: "/size-checker",
    element: <Suspense fallback={<div></div>}><SizeChecker /></Suspense>,
  },
  // 404
  {
    path: "*",
    element: <Suspense fallback={<div></div>}><NotFound /></Suspense>,
  },
]);

if (process.env.PROJECT === 'crazeoh') {
  router.navigate('/crazeoh')
}

ReactDOM.render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <div id="debug">
    </div>
  </React.StrictMode>,
  document.getElementById('root')
);