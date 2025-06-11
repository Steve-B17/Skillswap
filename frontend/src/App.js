import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { GlobalStyles } from '@mui/material';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TeacherDashboard from './components/TeacherDashboard';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import theme from './theme';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          backgroundColor: theme.palette.background.default,
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: theme.palette.error.main, marginBottom: '20px' }}>
            Something went wrong
          </h2>
          <p style={{ color: theme.palette.text.secondary, marginBottom: '20px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const globalStyles = {
  body: {
    backgroundColor: theme.palette.background.default,
    minHeight: '100vh',
  },
  '*': {
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
  },
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        setUser(parsedUserData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: theme.palette.background.default 
      }}>
        <div style={{ 
          fontSize: '1.5rem', 
          color: theme.palette.primary.main,
          fontFamily: theme.typography.fontFamily 
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={globalStyles} />
      <Router>
        <Navbar isAuthenticated={!!user} onLogout={handleLogout} />
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/" 
            element={
              user ? (
                <Navigate to={
                  user.role === 'admin' ? '/admin/dashboard' :
                  user.role === 'teacher' ? '/teacher/dashboard' :
                  '/dashboard'
                } replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to={
                  user.role === 'admin' ? '/admin/dashboard' :
                  user.role === 'teacher' ? '/teacher/dashboard' :
                  '/dashboard'
                } replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/register"
            element={
              user ? (
                <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
              ) : (
                <Register onLogin={handleLogin} />
              )
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ErrorBoundary>
                <PrivateRoute requiredRole="student">
                  <Dashboard />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/teacher/dashboard"
            element={
              <ErrorBoundary>
                <PrivateRoute requiredRole="teacher">
                  <TeacherDashboard />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ErrorBoundary>
                <PrivateRoute requiredRole="admin">
                  <AdminDashboard />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />
          <Route
            path="/profile"
            element={
              <ErrorBoundary>
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              </ErrorBoundary>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
