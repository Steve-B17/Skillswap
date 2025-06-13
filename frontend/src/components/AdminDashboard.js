import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  useTheme,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Fade,
  Modal
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import EventIcon from '@mui/icons-material/Event';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import axios from 'axios';

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

const StatCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '16px',
  background: 'linear-gradient(45deg, #FFA726 30%, #FF8E53 90%)',
  color: 'white',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(255, 159, 67, 0.3)',
  },
}));

const DetailOverlay = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
}));

const DetailContent = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(4),
  maxWidth: '800px',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto',
  borderRadius: '16px',
  background: 'rgba(255, 255, 255, 0.98)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
}));

const AdminDashboard = () => {
  const theme = useTheme();
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailType, setDetailType] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalSessions: 0,
    pendingSessions: 0,
    confirmedSessions: 0,
    completedSessions: 0,
    cancelledSessions: 0
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const [sessionsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!sessionsRes.ok || !usersRes.ok) {
        const sessionsError = await sessionsRes.json();
        const usersError = await usersRes.json();
        throw new Error(sessionsError.error || usersError.error || 'Failed to fetch data');
      }

      const [sessionsData, usersData] = await Promise.all([
        sessionsRes.json(),
        usersRes.json()
      ]);

      setSessions(sessionsData);
      setUsers(usersData);
      calculateStats(sessionsData, usersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateStats = (sessionsData, usersData) => {
    try {
      const teachers = usersData.filter(user => user.role === 'teacher');
      const students = usersData.filter(user => user.role === 'student');
      
      const sessionStats = sessionsData.reduce((acc, session) => {
        const status = session.status?.toLowerCase() || 'pending';
        if (acc[status] !== undefined) {
          acc[status]++;
        }
        return acc;
      }, {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0
      });

      setStats({
        totalUsers: usersData.length,
        totalTeachers: teachers.length,
        totalStudents: students.length,
        totalSessions: sessionsData.length,
        ...sessionStats
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
      setError('Error calculating statistics');
    }
  };

  const getSessionStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleOpenDetail = (item, type) => {
    setSelectedItem(item);
    setDetailType(type);
    setEditedData(item);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedItem(null);
    setDetailType(null);
    setEditMode(false);
    setEditedData(null);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      let endpoint = '';
      let method = 'PATCH';
      
      if (detailType === 'session') {
        endpoint = `${API_URL}/api/sessions/${selectedItem._id}`;
      } else if (detailType === 'user') {
        endpoint = `${API_URL}/api/admin/users/${selectedItem._id}`;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedData)
      });

      if (!response.ok) {
        throw new Error('Failed to update data');
      }

      const updatedData = await response.json();
      
      if (detailType === 'session') {
        setSessions(sessions.map(session => 
          session._id === updatedData._id ? updatedData : session
        ));
      } else if (detailType === 'user') {
        setUsers(users.map(user => 
          user._id === updatedData._id ? updatedData : user
        ));
      }

      setSuccess('Data updated successfully');
      setEditMode(false);
      setSelectedItem(updatedData);
      setEditedData(updatedData);
    } catch (error) {
      console.error('Error updating data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      let endpoint = '';
      if (detailType === 'session') {
        endpoint = `${API_URL}/api/sessions/${selectedItem._id}`;
      } else if (detailType === 'user') {
        endpoint = `${API_URL}/api/admin/users/${selectedItem._id}`;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      if (detailType === 'session') {
        setSessions(sessions.filter(session => session._id !== selectedItem._id));
      } else if (detailType === 'user') {
        setUsers(users.filter(user => user._id !== selectedItem._id));
      }

      setSuccess('Item deleted successfully');
      handleCloseDetail();
    } catch (error) {
      console.error('Error deleting item:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDetailContent = () => {
    if (!selectedItem || !detailType) return null;

    if (detailType === 'session') {
      return (
        <Box>
          <Typography variant="h5" gutterBottom>
            Session Details
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Skill"
                value={editMode ? editedData.skill : selectedItem.skill}
                onChange={(e) => setEditedData({...editedData, skill: e.target.value})}
                disabled={!editMode}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Start Time"
                type="datetime-local"
                value={editMode ? editedData.startTime : selectedItem.startTime}
                onChange={(e) => setEditedData({...editedData, startTime: e.target.value})}
                disabled={!editMode}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="End Time"
                type="datetime-local"
                value={editMode ? editedData.endTime : selectedItem.endTime}
                onChange={(e) => setEditedData({...editedData, endTime: e.target.value})}
                disabled={!editMode}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={editMode ? editedData.status : selectedItem.status}
                  onChange={(e) => setEditedData({...editedData, status: e.target.value})}
                  disabled={!editMode}
                  label="Status"
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={4}
                value={editMode ? editedData.notes : selectedItem.notes}
                onChange={(e) => setEditedData({...editedData, notes: e.target.value})}
                disabled={!editMode}
                margin="normal"
              />
            </Grid>
          </Grid>
        </Box>
      );
    }

    if (detailType === 'user') {
      return (
        <Box>
          <Typography variant="h5" gutterBottom>
            User Details
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={editMode ? editedData.name : selectedItem.name}
                onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                disabled={!editMode}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Email"
                value={editMode ? editedData.email : selectedItem.email}
                onChange={(e) => setEditedData({...editedData, email: e.target.value})}
                disabled={!editMode}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Role</InputLabel>
                <Select
                  value={editMode ? editedData.role : selectedItem.role}
                  onChange={(e) => setEditedData({...editedData, role: e.target.value})}
                  disabled={!editMode}
                  label="Role"
                >
                  <MenuItem value="student">Student</MenuItem>
                  <MenuItem value="teacher">Teacher</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Bio"
                multiline
                rows={4}
                value={editMode ? editedData.bio : selectedItem.bio}
                onChange={(e) => setEditedData({...editedData, bio: e.target.value})}
                disabled={!editMode}
                margin="normal"
              />
            </Grid>
          </Grid>
        </Box>
      );
    }
  };

  const renderSessionCard = (session) => (
    <StyledCard key={session._id}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            {session.skill}
          </Typography>
          <Chip
            label={session.status}
            color={getSessionStatusColor(session.status)}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {new Date(session.startTime).toLocaleString()} - {new Date(session.endTime).toLocaleString()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Student: {session.student?.name || 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Teacher: {session.teacher?.name || 'N/A'}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => handleOpenDetail(session, 'session')}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </StyledCard>
  );

  const renderUserCard = (user) => (
    <StyledCard key={user._id}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            {user.name}
          </Typography>
          <Chip
            label={user.role}
            color={user.role === 'teacher' ? 'primary' : 'secondary'}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {user.email}
        </Typography>
        {user.bio && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {user.bio.length > 100 ? `${user.bio.substring(0, 100)}...` : user.bio}
          </Typography>
        )}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => handleOpenDetail(user, 'user')}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </StyledCard>
  );

  return (
    <Container maxWidth="xl">
      <StyledPaper>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        
        {/* Stats Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Users</Typography>
              </Box>
              <Typography variant="h4">{stats.totalUsers}</Typography>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SchoolIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Teachers</Typography>
              </Box>
              <Typography variant="h4">{stats.totalTeachers}</Typography>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Students</Typography>
              </Box>
              <Typography variant="h4">{stats.totalStudents}</Typography>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EventIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Sessions</Typography>
              </Box>
              <Typography variant="h4">{stats.totalSessions}</Typography>
            </StatCard>
          </Grid>
        </Grid>

        {/* Search Section */}
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search sessions or users..."
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
        </Box>

        {/* Sessions Section */}
        <Typography variant="h5" gutterBottom>
          Recent Sessions
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {sessions.map(renderSessionCard)}
        </Grid>

        {/* Users Section */}
        <Typography variant="h5" gutterBottom>
          Users
        </Typography>
        <Grid container spacing={3}>
          {users.map(renderUserCard)}
        </Grid>
      </StyledPaper>

      {/* Detail Overlay */}
      <DetailOverlay
        open={isDetailOpen}
        onClose={handleCloseDetail}
        closeAfterTransition
      >
        <Fade in={isDetailOpen}>
          <DetailContent>
            <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
              <IconButton onClick={handleCloseDetail}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            {renderDetailContent()}
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {!editMode ? (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleEdit}
                    disabled={isLoading}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => setEditMode(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    Save
                  </Button>
                </>
              )}
            </Box>
          </DetailContent>
        </Fade>
      </DetailOverlay>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>

      {/* Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
};

export default AdminDashboard; 