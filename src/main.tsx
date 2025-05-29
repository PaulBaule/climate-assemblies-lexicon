import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import App from './App.tsx'
import './index.css'

// Define a basic theme (even if just default, it ensures the theme object is correctly structured)
const theme = extendTheme({})

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    </StrictMode>,
  )
} else {
  console.error("Failed to find the root element")
}
