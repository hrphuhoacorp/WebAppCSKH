// src/theme.ts
import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
    palette: {
        mode: 'light',

        primary: {
            main: '#086839',
            dark: '#0e4837',
            light: '#1b8f57',
            contrastText: '#ffffff'
        },

        secondary: {
            main: '#0e4837',
            dark: '#073326',
            light: '#2f6f5a',
            contrastText: '#ffffff'
        },

        background: {
            default: '#f5f7f6',
            paper: '#ffffff'
        },

        text: {
            primary: '#111827',
            secondary: '#4b5563',
            disabled: '#9ca3af'
        },

        divider: '#e5e7eb',

        error: {
            main: '#dc2626'
        },

        warning: {
            main: '#f59e0b'
        },

        success: {
            main: '#16a34a'
        },

        info: {
            main: '#0284c7'
        },

        customColors: {
            dark: '#0e4837',
            main: '#086839',
            light: '#1b8f57',
            bodyBg: '#f5f7f6',
            trackBg: '#d1d5db',
            avatarBg: '#dff7ea',
            darkPaperBg: '#0f172a',
            lightPaperBg: '#ffffff',
            tableHeaderBg: '#f1f5f9',
            mainGrey: '#6b7280',
            lightGrey: '#f3f4f6',
            disabledGrey: '#e5e7eb'
        }
    },

    typography: {
        fontFamily: 'Montserrat, Arial, sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 700 },
        button: {
            fontWeight: 600,
            textTransform: 'none'
        }
    },

    shape: {
        borderRadius: 12
    },

    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    boxShadow: 'none',
                    textTransform: 'none'
                }
            }
        },

        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
                }
            }
        },

        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none'
                }
            }
        },

        MuiTableHead: {
            styleOverrides: {
                root: {
                    backgroundColor: '#f1f5f9'
                }
            }
        }
    }
})

export default theme