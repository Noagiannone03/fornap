import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'dark',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  defaultRadius: 0,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      defaultProps: {
        variant: 'outline',
        color: 'dark',
      },
      styles: {
        root: {
          borderRadius: 0,
          borderWidth: 2,
          fontWeight: 500,
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          borderRadius: 0,
        },
      },
    },
    PasswordInput: {
      styles: {
        input: {
          borderRadius: 0,
        },
      },
    },
    Select: {
      styles: {
        input: {
          borderRadius: 0,
        },
      },
    },
    MultiSelect: {
      styles: {
        input: {
          borderRadius: 0,
        },
      },
    },
    Paper: {
      styles: {
        root: {
          borderRadius: 0,
        },
      },
    },
    Card: {
      styles: {
        root: {
          borderRadius: 0,
        },
      },
    },
  },
});
