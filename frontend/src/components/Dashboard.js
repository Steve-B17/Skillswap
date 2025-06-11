import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Tabs,
  Tab,
  InputAdornment,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';
import config from '../config';
import SessionDetails from './SessionDetails';
import SessionBooking from './SessionBooking';

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [userReviews, setUserReviews] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('student');

  const fetchUserReviews = useCallback(async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/api/reviews/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserReviews(prev => ({
        ...prev,
        [userId]: response.data
      }));
    } catch (error) {
      setError('Failed to fetch reviews');
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = userRole === 'teacher' 
        ? `${config.API_URL}/api/sessions/teacher-sessions`
        : `${config.API_URL}/api/sessions/my-sessions`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data);
    } catch (error) {
      setError('Failed to fetch sessions');
    } finally {
      setIsLoading(false);
    }
  }, [userRole]);

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/api/users/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          skill: searchQuery || ''
        }
      });

      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = payload.userId;
      const filteredUsers = response.data.filter(user => user._id !== currentUserId);
      setUsers(filteredUsers);
    } catch (error) {
      setError('Failed to fetch users');
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchSessions();
    fetchUsers();
  }, [fetchSessions, fetchUsers]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setIsSessionDetailsOpen(true);
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsReviewsOpen(true);
    fetchUserReviews(user._id);
  };

  const handleBookingClick = (user) => {
    setSelectedUser(user);
    setIsBookingOpen(true);
  };

  const handleSessionUpdate = async (updatedSession) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${config.API_URL}/api/sessions/${updatedSession._id}`,
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

  const handleBookingSuccess = (newSession) => {
    setSessions([...sessions, newSession]);
    setSuccess('Session booked successfully');
    setIsBookingOpen(false);
  };

  const renderSessionCard = (session) => (
    <Card key={session._id} sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {session.skill}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Teacher: {session.teacher.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Student: {session.student.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Date: {new Date(session.startTime).toLocaleDateString()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Time: {new Date(session.startTime).toLocaleTimeString()}
        </Typography>
        <Chip
          label={session.status}
          color={
            session.status === 'confirmed' ? 'success' :
            session.status === 'pending' ? 'warning' :
            session.status === 'completed' ? 'info' :
            'error'
          }
          sx={{ mt: 1 }}
        />
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => handleSessionClick(session)}>
          View Details
        </Button>
      </CardActions>
    </Card>
  );

  const renderUserCard = (user) => (
    <Card key={user._id} sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ mr: 2 }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="h6">
            {user.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {user.bio}
        </Typography>
        <Box sx={{ mt: 1 }}>
          {user.skills.map((skill, index) => (
            <Chip
              key={index}
              label={`${skill.name} (${skill.level})`}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => handleUserClick(user)}>
          View Reviews
        </Button>
        {userRole === 'student' && (
          <Button size="small" onClick={() => handleBookingClick(user)}>
            Book Session
          </Button>
        )}
      </CardActions>
    </Card>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </Snackbar>
      )}

      {success && (
        <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
          <Alert severity="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </Snackbar>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <Tabs value={selectedTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Sessions" />
        <Tab label="Users" />
      </Tabs>

      {selectedTab === 0 ? (
        <Grid container spacing={3}>
          {sessions.map(renderSessionCard)}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {users.map(renderUserCard)}
        </Grid>
      )}

      {selectedSession && (
        <SessionDetails
          session={selectedSession}
          open={isSessionDetailsOpen}
          onClose={() => setIsSessionDetailsOpen(false)}
          onUpdate={handleSessionUpdate}
        />
      )}

      {selectedUser && (
        <SessionBooking
          teacher={selectedUser}
          open={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </Container>
  );
};

export default Dashboard; 