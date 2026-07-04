import { createTheme, type ThemeOptions } from '@mui/material/styles'

const primary = {
  main: '#560072',
  light: '#8a3d9e',
  dark: '#3a004d',
  contrastText: '#ffffff'
}

const sharedComponents: ThemeOptions['components'] = {
  MuiButton: {
    styleOverrides: {
      root: { textTransform: 'none' },
      contained: {
        color: '#ffffff',
        '& .MuiButton-startIcon, & .MuiButton-endIcon, & .MuiSvgIcon-root': {
          color: 'inherit'
        }
      },
      containedPrimary: { color: '#ffffff' },
      containedSecondary: { color: '#ffffff' },
      containedError: { color: '#ffffff' },
      containedSuccess: { color: '#ffffff' },
      outlined: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              borderColor: theme.palette.primary.light,
              color: theme.palette.primary.light,
              '&:hover': {
                borderColor: '#c084fc',
                color: '#e9d5ff',
                backgroundColor: 'rgba(138, 61, 158, 0.16)'
              },
              '& .MuiButton-startIcon, & .MuiButton-endIcon, & .MuiSvgIcon-root': {
                color: 'inherit'
              }
            }
          : {},
      outlinedPrimary: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              borderColor: theme.palette.primary.light,
              color: theme.palette.primary.light
            }
          : {}
    }
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        minHeight: 36,
        fontWeight: 500
      }
    }
  },
  MuiTabs: {
    styleOverrides: {
      indicator: {
        height: 2
      }
    }
  },
  MuiAppBar: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderBottom: `1px solid ${theme.palette.divider}`
            }
          : {}
    }
  },
  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              backgroundColor: '#141820',
              borderRight: `1px solid ${theme.palette.divider}`
            }
          : {
              borderRight: `1px solid ${theme.palette.divider}`
            }
    }
  },
  MuiPaper: {
    styleOverrides: {
      outlined: ({ theme }) => ({
        borderColor: theme.palette.divider
      })
    }
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.divider
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.text.secondary
        }
      })
    }
  },
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }) =>
        theme.palette.mode === 'dark'
          ? {
              backgroundImage: 'none',
              border: `1px solid ${theme.palette.divider}`
            }
          : {}
    }
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 6,
        marginInline: 4,
        '&.Mui-selected': {
          backgroundColor:
            theme.palette.mode === 'dark' ? 'rgba(86, 0, 114, 0.28)' : 'rgba(86, 0, 114, 0.12)',
          color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.text.primary,
          '& .MuiListItemIcon-root': {
            color: theme.palette.mode === 'dark' ? '#ffffff' : theme.palette.primary.main
          },
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'dark' ? 'rgba(86, 0, 114, 0.36)' : 'rgba(86, 0, 114, 0.16)'
          }
        }
      })
    }
  },
  MuiChip: {
    styleOverrides: {
      outlined: ({ theme }) => ({
        borderColor: theme.palette.divider
      }),
      colorPrimary: {
        color: '#ffffff',
        '& .MuiChip-icon': { color: '#ffffff' },
        '& .MuiChip-deleteIcon': { color: 'rgba(255, 255, 255, 0.7)' }
      },
      colorSecondary: {
        color: '#ffffff',
        '& .MuiChip-icon': { color: '#ffffff' }
      },
      filled: ({ ownerState }) =>
        ownerState.color === 'primary' || ownerState.color === 'secondary'
          ? {
              color: '#ffffff',
              '& .MuiChip-icon': { color: '#ffffff' },
              '& .MuiChip-label': { color: '#ffffff' }
            }
          : {}
    }
  },
  MuiSelect: {
    styleOverrides: {
      select: ({ theme }) => ({
        '&.MuiSelect-select': {
          '&.MuiInputBase-input': {
            color: theme.palette.text.primary
          }
        }
      })
    }
  },
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderColor: theme.palette.divider,
        '& .MuiToggleButton-root': {
          borderColor: theme.palette.divider,
          color: theme.palette.text.secondary,
          '&.Mui-selected': {
            color: theme.palette.text.primary,
            backgroundColor:
              theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.14)' : 'rgba(0, 0, 0, 0.06)'
          }
        }
      })
    }
  },
  MuiAccordion: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
        backgroundImage: 'none'
      })
    }
  }
}

export function createAppTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary,
      secondary: { main: '#0265dc' },
      ...(isDark
        ? {
            background: {
              default: '#0f1117',
              paper: '#1a1d26'
            },
            divider: 'rgba(148, 163, 184, 0.14)',
            text: {
              primary: '#e2e8f0',
              secondary: '#94a3b8',
              disabled: 'rgba(148, 163, 184, 0.45)'
            },
            action: {
              active: '#cbd5e1',
              hover: 'rgba(148, 163, 184, 0.08)',
              selected: 'rgba(86, 0, 114, 0.24)',
              disabled: 'rgba(148, 163, 184, 0.38)',
              disabledBackground: 'rgba(148, 163, 184, 0.12)'
            }
          }
        : {
            background: {
              default: '#f5f5f5',
              paper: '#ffffff'
            }
          })
    },
    typography: {
      fontFamily: 'Roboto, sans-serif'
    },
    shape: {
      borderRadius: 8
    },
    components: {
      ...sharedComponents,
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: mode },
          body: {
            scrollbarColor: isDark ? '#334155 transparent' : undefined
          },
          '*::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(0, 0, 0, 0.2)',
            borderRadius: 4
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: 'transparent'
          }
        }
      }
    }
  })
}
