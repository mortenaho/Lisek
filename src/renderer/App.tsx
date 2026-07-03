import { createTheme, ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material'
import { useEffect, useMemo } from 'react'
import MainLayout from './layouts/MainLayout'
import { useAppStore } from './stores/appStore'

function App() {
  const themeMode = useAppStore((s) => s.themeMode)
  const loadInitial = useAppStore((s) => s.loadInitial)

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: {
            main: '#560072',
            light: '#8a3d9e',
            dark: '#3a004d',
            contrastText: '#ffffff'
          },
          secondary: { main: '#0265dc' },
          background: {
            default: themeMode === 'dark' ? '#1e1e1e' : '#f5f5f5',
            paper: themeMode === 'dark' ? '#2d2d2d' : '#ffffff'
          }
        },
        typography: {
          fontFamily: 'Roboto, sans-serif'
        },
        components: {
          MuiButton: { styleOverrides: { root: { textTransform: 'none' } } }
        }
      }),
    [themeMode]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          '.flux-resizing, .flux-resizing *': {
            cursor: 'inherit !important',
            userSelect: 'none !important'
          },
          '.flux-resizing [data-resize-panel]': {
            pointerEvents: 'none'
          }
        }}
      />
      <MainLayout />
    </ThemeProvider>
  )
}

export default App
