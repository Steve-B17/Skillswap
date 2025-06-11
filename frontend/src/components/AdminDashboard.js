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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import EventIcon from '@mui/icons-material/Event';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import config from '../config';

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

const AdminDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleStatusUpdate = async () => {
    if (!selectedSession) return;
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/api/sessions/${selectedSession._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update session status');
      }

      const updatedSession = await response.json();
      setSessions(sessions.map(session => 
        session._id === updatedSession._id ? updatedSession : session
      ));
      setSuccess('Session status updated successfully');
      setIsStatusDialogOpen(false);
    } catch (error) {
      console.error('Error updating status:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      setSessions(sessions.filter(session => session._id !== sessionId));
      setSuccess('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
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

  const sessionStatusData = [
    { name: 'Pending', value: stats.pendingSessions },
    { name: 'Confirmed', value: stats.confirmedSessions },
    { name: 'Completed', value: stats.completedSessions },
    { name: 'Cancelled', value: stats.cancelledSessions }
  ];

  const COLORS = [
    theme.palette.warning.main,
    theme.palette.success.main,
    theme.palette.info.main,
    theme.palette.error.main
  ];

  const renderSessionCard = (session) => {
    if (!session || !session.teacher || !session.student) {
      return null;
    }

    return (
      <StyledCard key={session._id} sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
                {session.skill || 'No skill specified'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Teacher: {session.teacher.name || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Student: {session.student.name || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Date: {session.startTime ? new Date(session.startTime).toLocaleDateString() : 'No date'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Time: {session.startTime ? new Date(session.startTime).toLocaleTimeString() : 'No time'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={session.status || 'pending'}
                  sx={{
                    backgroundColor: getSessionStatusColor(session.status),
                    color: 'white',
                    fontWeight: 'bold',
                    borderRadius: '8px'
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={() => {
                    setSelectedSession(session);
                    setNewStatus(session.status || 'pending');
                    setIsStatusDialogOpen(true);
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => handleDeleteSession(session._id)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>
    );
  };

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
          Admin Dashboard
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Users</Typography>
              </Box>
              <Typography variant="h4">{stats.totalUsers}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {stats.totalTeachers} Teachers / {stats.totalStudents} Students
              </Typography>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EventIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total Sessions</Typography>
              </Box>
              <Typography variant="h4">{stats.totalSessions}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Across all statuses
              </Typography>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SchoolIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Active Teachers</Typography>
              </Box>
              <Typography variant="h4">{stats.totalTeachers}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Available for sessions
              </Typography>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BarChartIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Session Status</Typography>
              </Box>
              <Typography variant="h4">{stats.confirmedSessions}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Confirmed sessions
              </Typography>
            </StatCard>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <Typography variant="h6" gutterBottom>
                Session Status Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sessionStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sessionStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </StyledPaper>
          </Grid>
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <Typography variant="h6" gutterBottom>
                Sessions Over Time
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sessions.map(session => ({
                      date: new Date(session.startTime).toLocaleDateString(),
                      count: 1
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={theme.palette.primary.main}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </StyledPaper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Search and Sessions List */}
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
        ) : (
          sessions
            .filter(session => {
              const searchLower = searchQuery.toLowerCase();
              return (
                session.skill.toLowerCase().includes(searchLower) ||
                session.teacher.name.toLowerCase().includes(searchLower) ||
                session.student.name.toLowerCase().includes(searchLower)
              );
            })
            .map(renderSessionCard)
        )}
      </StyledPaper>

      <Dialog
        open={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <DialogTitle>Update Session Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            color="primary"
            disabled={isLoading}
          >
            Update
          </Button>
        </DialogActions>
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

export default AdminDashboard; 