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
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  Alert,
  Snackbar,
  CircularProgress,
  Rating,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';
import SessionDetails from './SessionDetails';
import SessionBooking from './SessionBooking';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: '24px',
  boxShadow: '0 8px 32px rgba(255, 159, 67, 0.1)',
  border: '1px solid rgba(255, 159, 67, 0.1)',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: '16px',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(255, 159, 67, 0.15)',
  },
}));

const ReviewList = styled(List)(({ theme }) => ({
  maxHeight: '200px',
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(255, 159, 67, 0.1)',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255, 159, 67, 0.3)',
    borderRadius: '4px',
    '&:hover': {
      background: 'rgba(255, 159, 67, 0.5)',
    },
  },
}));

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

  useEffect(() => {
    if (selectedTab === 0) {
      fetchSessions();
    } else if (selectedTab === 1) {
      fetchUsers();
    }
  }, [selectedTab, searchQuery]);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = userRole === 'teacher' 
        ? 'http://localhost:5000/api/sessions/teacher-sessions'
        : 'http://localhost:5000/api/sessions/my-sessions';
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Ensure we're setting an array of sessions
      const sessionsData = Array.isArray(response.data) 
        ? response.data 
        : response.data.sessions || [];

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to fetch sessions');
      setSessions([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          skill: searchQuery || ''
        }
      });

      // Get current user ID from token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = payload.userId;

      // Filter out the current user from the list
      const filteredUsers = response.data.filter(user => user._id !== currentUserId);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
      setUsers([]); // Set empty array on error
    }
  };

  const fetchUserReviews = async (userId) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/api/reviews/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data || !response.data.reviews) {
        throw new Error('Invalid response format');
      }

      setUserReviews(prev => ({
        ...prev,
        [userId]: response.data.reviews
      }));
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError(error.response?.data?.error || 'Failed to fetch reviews');
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

      setSessions(prevSessions => 
        prevSessions.map(session => 
          session._id === response.data._id ? response.data : session
        )
      );
      setSuccess('Session updated successfully');
      setIsSessionDetailsOpen(false);
    } catch (error) {
      console.error('Error updating session:', error);
      setError('Failed to update session');
    }
  };

  const handleBookingSuccess = (newSession) => {
    setSessions(prevSessions => [...prevSessions, newSession]);
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

  // Ensure sessions is an array before filtering
  const filteredSessions = Array.isArray(sessions) ? sessions.filter(session => {
    if (!session || !session.skill || !session.teacher || !session.student) {
      return false;
    }
    const searchLower = searchQuery.toLowerCase();
    return (
      session.skill.toLowerCase().includes(searchLower) ||
      session.teacher.name.toLowerCase().includes(searchLower) ||
      session.student.name.toLowerCase().includes(searchLower)
    );
  }) : [];

  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    if (!user || !user.name || !user.skills) {
      return false;
    }
    const searchLower = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.skills.some(skill => skill.name.toLowerCase().includes(searchLower))
    );
  }) : [];

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
    fetchUserReviews(user._id);
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
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : userReviews[selectedUser._id]?.length > 0 ? (
              <List>
                {userReviews[selectedUser._id].map((review, index) => (
                  <ListItem key={index} alignItems="flex-start" sx={{ flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Rating
                        value={review.rating}
                        precision={0.5}
                        readOnly
                        size="small"
                        sx={{ color: '#FF9F43' }}
                      />
                      <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {review.comment}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Skill: {review.skill}
                    </Typography>
                  </ListItem>
                ))}
              </List>
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