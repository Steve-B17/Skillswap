import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  TextField,
  InputAdornment,
  Dialog,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import SessionDetails from './SessionDetails';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: '24px',
  boxShadow: '0 8px 32px rgba(255, 159, 67, 0.1)',
  border: '1px solid rgba(255, 159, 67, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 12px 48px rgba(255, 159, 67, 0.15)',
  }
}));

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: '16px',
  transition: 'all 0.3s ease',
  background: 'rgba(255, 255, 255, 0.98)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(255, 159, 67, 0.15)',
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  textTransform: 'none',
  fontWeight: 600,
  padding: theme.spacing(1, 3),
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(255, 159, 67, 0.2)',
  }
}));

const TeacherDashboard = () => {
  const theme = useTheme();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [searchQuery]);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('http://localhost:5000/api/sessions/teacher-sessions', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Failed to fetch sessions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionUpdate = async (updatedSession) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/api/sessions/${updatedSession._id}`,
        { status: updatedSession.status },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSessions(sessions.map(session => 
        session._id === response.data._id ? response.data : session
      ));
      setSuccess('Session updated successfully');
      setIsSessionDetailsOpen(false);
    } catch (error) {
      setError('Failed to update session');
    }
  };

  const handleAcceptSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/api/sessions/${sessionId}/status`,
        { status: 'confirmed' },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSessions(sessions.map(session => 
        session._id === response.data._id ? response.data : session
      ));
      setSuccess('Session accepted successfully');
    } catch (error) {
      console.error('Error accepting session:', error);
      setError(error.response?.data?.error || 'Failed to accept session');
    }
  };

  const handleRejectSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/api/sessions/${sessionId}/status`,
        { status: 'cancelled' },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSessions(sessions.map(session => 
        session._id === response.data._id ? response.data : session
      ));
      setSuccess('Session rejected successfully');
    } catch (error) {
      console.error('Error rejecting session:', error);
      setError(error.response?.data?.error || 'Failed to reject session');
    }
  };

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return theme.palette.warning.main;
      case 'confirmed':
        return theme.palette.success.main;
      case 'completed':
        return theme.palette.info.main;
      case 'cancelled':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const filteredSessions = sessions.filter(session => {
    const searchLower = searchQuery.toLowerCase();
    return (
      session.skill.toLowerCase().includes(searchLower) ||
      session.student.name.toLowerCase().includes(searchLower)
    );
  });

  const renderEmptyState = (message) => (
    <Box sx={{ 
      textAlign: 'center', 
      py: 4,
      color: 'text.secondary'
    }}>
      <Typography variant="h6" gutterBottom>
        {message}
      </Typography>
      <Typography variant="body2">
        Try adjusting your search or check back later.
      </Typography>
    </Box>
  );

  const renderSessionCard = (session) => (
    <StyledCard key={session._id} sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
              {session.skill}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Student: {session.student.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date: {new Date(session.startTime).toLocaleDateString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Time: {new Date(session.startTime).toLocaleTimeString()}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Chip
                label={session.status}
                sx={{
                  backgroundColor: getSessionStatusColor(session.status),
                  color: 'white',
                  fontWeight: 'bold',
                  borderRadius: '8px'
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          {session.status === 'pending' && (
            <>
              <StyledButton
                size="small"
                color="success"
                variant="contained"
                onClick={() => handleAcceptSession(session._id)}
                sx={{ mr: 1 }}
              >
                Accept
              </StyledButton>
              <StyledButton
                size="small"
                color="error"
                variant="contained"
                onClick={() => handleRejectSession(session._id)}
              >
                Reject
              </StyledButton>
            </>
          )}
        </Box>
        <StyledButton
          size="small"
          color="primary"
          variant="contained"
          onClick={() => {
            setSelectedSession(session);
            setIsSessionDetailsOpen(true);
          }}
        >
          View Details
        </StyledButton>
      </CardActions>
    </StyledCard>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <StyledPaper>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            color: theme.palette.primary.main,
            fontWeight: 600,
            mb: 4
          }}
        >
          My Teaching Sessions
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : filteredSessions.length > 0 ? (
          filteredSessions.map(renderSessionCard)
        ) : (
          renderEmptyState('No sessions found')
        )}
      </StyledPaper>

      <Dialog
        open={isSessionDetailsOpen}
        onClose={() => setIsSessionDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        {selectedSession && (
          <SessionDetails
            session={selectedSession}
            onClose={() => setIsSessionDetailsOpen(false)}
            onUpdate={handleSessionUpdate}
            userRole="teacher"
          />
        )}
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          onClose={() => setError('')}
          sx={{ 
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          onClose={() => setSuccess('')}
          sx={{ 
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TeacherDashboard; 