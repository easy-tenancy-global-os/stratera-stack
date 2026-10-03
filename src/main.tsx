import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import PreloaderProvider from './components/Preloader'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PreloaderProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PreloaderProvider>
  </React.StrictMode>
)
