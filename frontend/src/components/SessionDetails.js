import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { Rating } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: '24px',
  boxShadow: '0 8px 32px rgba(255, 159, 67, 0.1)',
  border: '1px solid rgba(255, 159, 67, 0.1)',
  maxWidth: '800px',
  margin: '0 auto',
}));

const SessionDetails = ({ session, onUpdate, onClose, userRole }) => {
  const [meetingLink, setMeetingLink] = useState(session.meetingLink || '');
  const [notes, setNotes] = useState(session.notes || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [review, setReview] = useState({
    rating: 5,
    comment: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReviews, setSessionReviews] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (session) {
      fetchSessionReviews();
      // Get current user ID from token
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUserId(payload.userId);
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    }
  }, [session]);

  const fetchSessionReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/reviews/session/${session._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setSessionReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch session reviews:', error);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/api/sessions/${session._id}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess(`Session ${newStatus} successfully`);
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update session status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMeetingLinkUpdate = async () => {
    if (!meetingLink.trim()) {
      setError('Meeting link cannot be empty');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/api/sessions/${session._id}/meeting-link`,
        { meetingLink },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess('Meeting link updated successfully');
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update meeting link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotesUpdate = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/api/sessions/${session._id}/notes`,
        { notes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess('Notes updated successfully');
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!review.comment.trim()) {
      setError('Please provide a review comment');
      return;
    }

    if (!currentUserId) {
      setError('User authentication required');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // Determine if the current user is the teacher or student
      const isTeacher = session.teacher._id === currentUserId;
      const revieweeId = isTeacher ? session.student._id : session.teacher._id;

      const response = await axios.post(
        'http://localhost:5000/api/reviews',
        {
          session: session._id,
          reviewee: revieweeId,
          rating: review.rating,
          comment: review.comment.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess('Review submitted successfully');
      setIsReviewDialogOpen(false);
      setReview({ rating: 5, comment: '' });
      await fetchSessionReviews();
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Review submission error:', error.response?.data);
      setError(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
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

  const canUpdateNotes = userRole === 'student' && session.status === 'pending';
  const canUpdateMeetingLink = userRole === 'student' && session.status === 'confirmed';
  const canReview = userRole === 'student' && session.status === 'completed' && !sessionReviews.some(review => review.reviewer._id === currentUserId);
  const canCompleteSession = userRole === 'teacher' && session.status === 'confirmed';

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <StyledPaper elevation={3}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#FF9F43',
                fontWeight: 600,
                mb: 1
              }}
            >
              Session Details
            </Typography>
            <Chip
              label={session.status.toUpperCase()}
              sx={{
                backgroundColor: getStatusColor(session.status),
                color: 'white',
                fontWeight: 600
              }}
            />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Session Information
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>Skill:</strong> {session.skill}
                </Typography>
                <Typography variant="body1">
                  <strong>Start Time:</strong> {new Date(session.startTime).toLocaleString()}
                </Typography>
                <Typography variant="body1">
                  <strong>End Time:</strong> {new Date(session.endTime).toLocaleString()}
                </Typography>
                <Typography variant="body1">
                  <strong>Teacher:</strong> {session.teacher.name}
                </Typography>
                <Typography variant="body1">
                  <strong>Student:</strong> {session.student.name}
                </Typography>
                {session.meetingLink && userRole === 'teacher' && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255, 159, 67, 0.1)', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ color: '#FF9F43', fontWeight: 600, mb: 1 }}>
                      Meeting Link
                    </Typography>
                    <Button
                      variant="contained"
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        backgroundColor: '#4CAF50',
                        '&:hover': {
                          backgroundColor: '#388E3C',
                        },
                        mb: 1
                      }}
                    >
                      Join Session
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      Click the button above to join your session with the student.
                    </Typography>
                  </Box>
                )}

                {session.meetingLink && userRole === 'student' && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255, 159, 67, 0.1)', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ color: '#FF9F43', fontWeight: 600, mb: 1 }}>
                      Current Meeting Link
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Your teacher will use this link to join the session.
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', color: '#666' }}>
                      {session.meetingLink}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            {canUpdateNotes && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Session Notes
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about the session..."
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleNotesUpdate}
                  disabled={isLoading}
                  sx={{
                    backgroundColor: '#FF9F43',
                    '&:hover': {
                      backgroundColor: '#FF8F2A',
                    }
                  }}
                >
                  {isLoading ? 'Updating...' : 'Update Notes'}
                </Button>
              </Grid>
            )}

            {canUpdateMeetingLink && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Meeting Link
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Please provide the meeting link for your session. This will be shared with your teacher.
                </Typography>
                <TextField
                  fullWidth
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="Enter meeting link (e.g., Zoom, Google Meet, etc.)..."
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleMeetingLinkUpdate}
                  disabled={isLoading}
                  sx={{
                    backgroundColor: '#FF9F43',
                    '&:hover': {
                      backgroundColor: '#FF8F2A',
                    }
                  }}
                >
                  {isLoading ? 'Updating...' : 'Update Meeting Link'}
                </Button>
              </Grid>
            )}

            {userRole === 'teacher' && session.status === 'pending' && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => handleStatusUpdate('confirmed')}
                    disabled={isLoading}
                    sx={{
                      backgroundColor: '#66BB6A',
                      '&:hover': {
                        backgroundColor: '#4CAF50',
                      }
                    }}
                  >
                    Accept Session
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => handleStatusUpdate('cancelled')}
                    disabled={isLoading}
                    sx={{
                      backgroundColor: '#EF5350',
                      '&:hover': {
                        backgroundColor: '#D32F2F',
                      }
                    }}
                  >
                    Decline Session
                  </Button>
                </Box>
              </Grid>
            )}

            {canCompleteSession && (
              <Grid item xs={12}>
                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(66, 165, 245, 0.1)', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#1976D2' }}>
                    Complete Session
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Once you complete the session, the student will be able to provide a review.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={isLoading}
                    sx={{
                      backgroundColor: '#1976D2',
                      '&:hover': {
                        backgroundColor: '#1565C0',
                      }
                    }}
                  >
                    {isLoading ? 'Completing...' : 'Complete Session'}
                  </Button>
                </Box>
              </Grid>
            )}

            {session.status === 'completed' && userRole === 'student' && !sessionReviews.some(review => review.reviewer._id === currentUserId) && (
              <Grid item xs={12}>
                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255, 159, 67, 0.1)', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#FF9F43' }}>
                    Session Review
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Please provide your feedback about the session. Your review will help the teacher improve their teaching.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => setIsReviewDialogOpen(true)}
                    sx={{
                      backgroundColor: '#FF9F43',
                      '&:hover': {
                        backgroundColor: '#FF8F2A',
                      }
                    }}
                  >
                    Leave a Review
                  </Button>
                </Box>
              </Grid>
            )}

            {sessionReviews.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                  Session Reviews
                </Typography>
                <List>
                  {sessionReviews.map((review, index) => (
                    <React.Fragment key={review._id}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#FF9F43' }}>
                            {review.reviewer.name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="subtitle1" sx={{ mr: 1 }}>
                                {review.reviewer.name}
                              </Typography>
                              <Rating value={review.rating} readOnly size="small" />
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
                      {index < sessionReviews.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              </Grid>
            )}
          </Grid>
        </StyledPaper>
      </Box>

      <Dialog
        open={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#FF9F43' }}>
          Leave a Review
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Rating:</Typography>
            <Rating
              value={review.rating}
              onChange={(event, newValue) => {
                setReview({ ...review, rating: newValue });
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              value={review.comment}
              onChange={(e) => setReview({ ...review, comment: e.target.value })}
              placeholder="Write your review..."
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsReviewDialogOpen(false)}
            sx={{ color: '#FF9F43' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReviewSubmit}
            variant="contained"
            disabled={isLoading}
            sx={{
              backgroundColor: '#FF9F43',
              '&:hover': {
                backgroundColor: '#FF8F2A',
              }
            }}
          >
            {isLoading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>

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
    </Container>
  );
};

export default SessionDetails; 