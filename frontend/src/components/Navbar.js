import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import LogoutIcon from '@mui/icons-material/Logout';
import { styled } from '@mui/material/styles';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(45deg, #2E3B55 30%, #4A5D7A 90%)',
  padding: '8px 0',
}));

const Logo = styled(Typography)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  textDecoration: 'none',
  color: 'inherit',
  fontWeight: 700,
  fontSize: '1.5rem',
  '&:hover': {
    color: theme.palette.secondary.main,
  },
}));

const NavButton = styled(Button)(({ theme }) => ({
  marginLeft: theme.spacing(2),
  borderRadius: '20px',
  padding: '6px 20px',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
}));

const Navbar = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <StyledAppBar position="sticky">
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Logo component={RouterLink} to="/">
            <SchoolIcon sx={{ fontSize: 32 }} />
            SkillSwap
          </Logo>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isAuthenticated ? (
              <>
                <NavButton
                  color="inherit"
                  component={RouterLink}
                  to="/dashboard"
                >
                  Dashboard
                </NavButton>
                <NavButton
                  color="inherit"
                  component={RouterLink}
                  to="/profile"
                >
                  Profile
                </NavButton>
                <NavButton
                  color="inherit"
                  onClick={handleLogout}
                  startIcon={<LogoutIcon />}
                  sx={{
                    ml: 2,
                    color: '#ff4444',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    },
                  }}
                >
                  Sign Out
                </NavButton>
              </>
            ) : (
              <>
                <NavButton
                  color="inherit"
                  component={RouterLink}
                  to="/login"
                >
                  Login
                </NavButton>
                <NavButton
                  variant="contained"
                  color="secondary"
                  component={RouterLink}
                  to="/register"
                  sx={{
                    ml: 2,
                    '&:hover': {
                      backgroundColor: 'secondary.dark',
                    },
                  }}
                >
                  Get Started
                </NavButton>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </StyledAppBar>
  );
};

export default Navbar; 