import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();

  const verifyToken = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      // Set the token in the Authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify the token
      await axios.get('/api/admin/verify');
      setIsAuthenticated(true);
    } catch (error) {
      // If token is expired or invalid, try to refresh it
      if (error.response?.status === 401) {
        try {
          const response = await axios.post('/api/admin/refresh-token');
          localStorage.setItem('adminToken', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          setIsAuthenticated(true);
        } catch (refreshError) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    }
  }, []);

  useEffect(() => {
    verifyToken();

    // Set up axios interceptor for token refresh
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            const response = await axios.post('/api/admin/refresh-token');
            localStorage.setItem('adminToken', response.data.token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            return axios(error.config);
          } catch (refreshError) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            setIsAuthenticated(false);
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [verifyToken]);

  if (isAuthenticated === null) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute; 