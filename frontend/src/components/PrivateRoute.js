import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('userData');

  // If not authenticated, redirect to login
  if (!token || !userData) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userData);
    
    // If no role is required, just check authentication
    if (!requiredRole) {
      return children;
    }

    // If role is required and user doesn't have it
    if (user.role !== requiredRole) {
      // Redirect based on user's actual role
      switch (user.role) {
        case 'teacher':
          return <Navigate to="/teacher/dashboard" replace />;
        case 'admin':
          return <Navigate to="/admin/dashboard" replace />;
        case 'student':
          return <Navigate to="/dashboard" replace />;
        default:
          return <Navigate to="/login" replace />;
      }
    }

    // If authenticated and authorized, render children
    return children;
  } catch (error) {
    // If there's an error parsing user data, clear storage and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    return <Navigate to="/login" replace />;
  }
};

export default PrivateRoute; 