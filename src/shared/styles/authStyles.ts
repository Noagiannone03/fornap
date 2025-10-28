// Styles partagés pour les pages d'authentification et abonnement
// Design noir et blanc minimaliste avec bordures arrondies

export const authContainerStyles = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  background: '#ffffff',
  padding: '2rem 1rem',
};

export const authPaperStyles = {
  maxWidth: '650px',
  margin: '0 auto',
  padding: '3.5rem',
  borderRadius: '24px',
  border: '2px solid #000',
  background: 'white',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

export const authTitleStyles = {
  fontSize: '2rem',
  fontWeight: 900,
  color: '#000',
  marginBottom: '0.5rem',
};

export const authSubtitleStyles = {
  color: '#495057',
  fontSize: '0.95rem',
};

export const authButtonStyles = {
  height: '48px',
  fontSize: '1rem',
  fontWeight: 700,
  background: '#000',
  border: 'none',
  color: '#fff',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: '#333',
  },
};

export const authButtonOutlineStyles = {
  height: '48px',
  fontSize: '1rem',
  fontWeight: 700,
  background: 'transparent',
  border: '2px solid #000',
  color: '#000',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: '#000',
    color: '#fff',
  },
};

export const authLinkStyles = {
  color: '#000',
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'underline',
  transition: 'color 0.2s ease',
  '&:hover': {
    color: '#495057',
  },
};
