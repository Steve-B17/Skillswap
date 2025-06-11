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
  Avatar
} from '@mui/material';
import axios from 'axios';
import config from '../config';
import SessionDetails from './SessionDetails';
import SessionBooking from './SessionBooking';

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [userReviews, setUserReviews] = useState({});
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Get user role from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
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

  // Fetch reviews when a user is selected for viewing reviews
  useEffect(() => {
    if (selectedUser && isReviewsOpen) {
      fetchUserReviews(selectedUser._id);
    }
  }, [selectedUser, isReviewsOpen]);

  const fetchUserReviews = async (userId) => {
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

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA726';
      case 'confirmed':
        return '#66BB6A';
      case 'completed':
        return '#42A5F5';
      case 'cancelled':
        return '#EF5350';
      default:
        return '#757575';
    }
  };

  const filteredSessions = sessions.filter(session => {
    const searchLower = searchQuery.toLowerCase();
    return (
      session.skill.toLowerCase().includes(searchLower) ||
      session.teacher.name.toLowerCase().includes(searchLower) ||
      session.student.name.toLowerCase().includes(searchLower)
    );
  });

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.skills.some(skill => skill.name.toLowerCase().includes(searchLower))
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

  const handleViewReviews = (user) => {
    setSelectedUser(user);
    setIsReviewsOpen(true);
  };

  const renderUserCard = (user) => (
    <Grid item xs={12} sm={6} md={4} key={user._id}>
      <StyledCard>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: '#FF9F43', mr: 2 }}>
              {user.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" gutterBottom>
                {user.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Rating
                  value={user.rating || 0}
                  precision={0.5}
                  readOnly
                  size="small"
                  sx={{ color: '#FF9F43' }}
                />
                <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                  ({userReviews[user._id]?.length || 0} reviews)
                </Typography>
              </Box>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Teaches:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {user.skills
              .filter(skill => skill.level === 'Advanced' || skill.level === 'Expert')
              .map((skill, index) => (
                <Chip
                  key={index}
                  label={`${skill.name} (${skill.level})`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 159, 67, 0.1)',
                    color: '#FF9F43',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 159, 67, 0.2)',
                    }
                  }}
                />
              ))}
          </Box>
          {user.bio && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {user.bio}
            </Typography>
          )}
        </CardContent>
        <CardActions>
          <Button
            size="small"
            onClick={() => handleViewReviews(user)}
            sx={{
              color: '#FF9F43',
              '&:hover': {
                backgroundColor: 'rgba(255, 159, 67, 0.1)',
              }
            }}
          >
            View Reviews
          </Button>
          <Button
            size="small"
            onClick={() => {
              setSelectedTeacher(user);
              setIsBookingOpen(true);
            }}
            sx={{
              color: '#FF9F43',
              '&:hover': {
                backgroundColor: 'rgba(255, 159, 67, 0.1)',
              }
            }}
          >
            Book Session
          </Button>
        </CardActions>
      </StyledCard>
    </Grid>
  );

  const renderSessionCard = (session) => (
    <Grid item xs={12} sm={6} md={4} key={session._id}>
      <StyledCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {session.skill}
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            {new Date(session.startTime).toLocaleString()}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: getSessionStatusColor(session.status),
              fontWeight: 600,
              mb: 1
            }}
          >
            Status: {session.status}
          </Typography>
          <Typography variant="body2">
            {userRole === 'teacher' ? 'Student' : 'Teacher'}: {userRole === 'teacher' ? session.student.name : session.teacher.name}
          </Typography>
          {session.notes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Notes: {session.notes}
            </Typography>
          )}
        </CardContent>
        <CardActions>
          <Button 
            size="small" 
            onClick={() => {
              setSelectedSession(session);
              setIsSessionDetailsOpen(true);
            }}
            sx={{ color: '#FF9F43' }}
          >
            View Details
          </Button>
          {userRole === 'teacher' && session.status === 'pending' && (
            <>
              <Button 
                size="small" 
                onClick={() => handleSessionUpdate({ ...session, status: 'confirmed' })}
                sx={{ color: '#66BB6A' }}
              >
                Accept
              </Button>
              <Button 
                size="small" 
                onClick={() => handleSessionUpdate({ ...session, status: 'cancelled' })}
                sx={{ color: '#EF5350' }}
              >
                Decline
              </Button>
            </>
          )}
        </CardActions>
      </StyledCard>
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <StyledPaper elevation={3}>
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              color: '#FF9F43',
              fontWeight: 600,
              textAlign: 'center'
            }}
          >
            {userRole === 'teacher' ? 'Teaching Dashboard' : 'Student Dashboard'}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={`Search ${userRole === 'teacher' ? 'sessions' : 'sessions or teachers'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#FF9F43' }} />
                </InputAdornment>
              ),
            }}
          />
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: '#FF9F43',
                '&.Mui-selected': {
                  color: '#FF8F2A',
                  fontWeight: 600,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#FF9F43',
              },
            }}
          >
            <Tab label={userRole === 'teacher' ? 'Teaching Sessions' : 'My Sessions'} />
            {userRole === 'student' && <Tab label="Find Teachers" />}
          </Tabs>
        </Box>

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            severity="error" 
            onClose={() => setError('')}
            sx={{ 
              backgroundColor: '#FFE4E4',
              color: '#FF5252',
              '& .MuiAlert-icon': {
                color: '#FF5252',
              },
            }}
          >
            {error}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            severity="success" 
            onClose={() => setSuccess('')}
            sx={{ 
              backgroundColor: '#E6FFE6',
              color: '#4CAF50',
              '& .MuiAlert-icon': {
                color: '#4CAF50',
              },
            }}
          >
            {success}
          </Alert>
        </Snackbar>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#FF9F43' }} />
          </Box>
        ) : (
          <>
            {selectedTab === 0 ? (
              <Grid container spacing={3}>
                {filteredSessions.length > 0 ? (
                  filteredSessions.map(renderSessionCard)
                ) : (
                  <Grid item xs={12}>
                    {renderEmptyState(
                      searchQuery 
                        ? 'No sessions found matching your search'
                        : 'No sessions found'
                    )}
                  </Grid>
                )}
              </Grid>
            ) : (
              <Grid container spacing={3}>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(renderUserCard)
                ) : (
                  <Grid item xs={12}>
                    {renderEmptyState(
                      searchQuery 
                        ? 'No teachers found matching your search'
                        : 'No teachers found'
                    )}
                  </Grid>
                )}
              </Grid>
            )}
          </>
        )}
      </StyledPaper>

      <Dialog
        open={isSessionDetailsOpen}
        onClose={() => setIsSessionDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedSession && (
          <SessionDetails
            session={selectedSession}
            onUpdate={handleSessionUpdate}
            onClose={() => setIsSessionDetailsOpen(false)}
            userRole={userRole}
          />
        )}
      </Dialog>

      <Dialog
        open={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedTeacher && (
          <SessionBooking
            teacher={selectedTeacher}
            onSuccess={handleBookingSuccess}
            onClose={() => setIsBookingOpen(false)}
          />
        )}
      </Dialog>

      <Dialog
        open={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedUser && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#FF9F43' }}>
              Reviews for {selectedUser.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Rating
                value={selectedUser.rating || 0}
                precision={0.5}
                readOnly
                sx={{ color: '#FF9F43' }}
              />
              <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                ({userReviews[selectedUser._id]?.length || 0} reviews)
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            {userReviews[selectedUser._id]?.length > 0 ? (
              <ReviewList>
                {userReviews[selectedUser._id].map((review, index) => (
                  <ListItem key={index} alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#FF9F43' }}>
                        {review.reviewer?.name?.charAt(0) || <PersonIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ mr: 1 }}>
                            {review.reviewer?.name || 'Anonymous'}
                          </Typography>
                          <Rating
                            value={review.rating}
                            size="small"
                            readOnly
                            sx={{ color: '#FF9F43' }}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {review.comment}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {new Date(review.createdAt).toLocaleDateString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </ReviewList>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No reviews yet
              </Typography>
            )}
          </Box>
        )}
      </Dialog>
    </Container>
  );
};

export default Dashboard; 