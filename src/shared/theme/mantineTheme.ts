import { createTheme, rem, alpha } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'lg',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(32), lineHeight: '1.2' },
      h2: { fontSize: rem(26), lineHeight: '1.3' },
      h3: { fontSize: rem(22), lineHeight: '1.3' },
    },
  },
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
        fw: 600,
        radius: 'md',
      },
      styles: (theme) => ({
        root: {
          transition: 'all 0.2s ease',
          boxShadow: theme.shadows.xs,
          '&:active': { transform: 'translateY(1px)' },
        },
      }),
    },
    Paper: {
      defaultProps: {
        shadow: 'sm',
        withBorder: true,
        bg: 'white',
        radius: 'lg',
      },
      styles: (theme) => ({
        root: {
          borderColor: theme.colors.gray[1],
          transition: 'box-shadow 0.3s ease',
        },
      }),
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        withBorder: true,
        padding: 'xl',
        bg: 'white',
        radius: 'lg',
      },
      styles: (theme) => ({
        root: {
          borderColor: theme.colors.gray[1],
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows.md,
          },
        },
      }),
    },
    Badge: {
      defaultProps: {
        radius: 'md',
        variant: 'light',
        fw: 600,
        size: 'md',
      },
    },
    ThemeIcon: {
      defaultProps: {
        variant: 'light',
        radius: 'md',
        size: 'xl',
      }
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
      styles: (theme) => ({
        input: {
          backgroundColor: theme.colors.gray[0],
          borderColor: 'transparent',
          '&:focus': {
            backgroundColor: 'white',
            borderColor: theme.colors.indigo[4],
          },
        },
      }),
    },
  },
});
