import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx'
import OverviewPage from './pages/OverviewPage.tsx';
import Layout from './components/Layout.tsx';
import theme from './theme'
import './assets/fonts/fonts.css'
import './index.css'

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ChakraProvider theme={theme}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/define" element={<App />} />
              <Route path="/connect" element={<OverviewPage />} />
              <Route path="/" element={<Navigate to="/define" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ChakraProvider>
    </StrictMode>,
  )
} else {
  console.error("Failed to find the root element")
}
