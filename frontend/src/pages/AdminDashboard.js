import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress
} from '@mui/material';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [statistics, setStatistics] = useState({
    totalSessions: 0,
    ongoingSessions: 0,
    completedSessions: 0,
    rejectedSessions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [sessionsRes, statsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/admin/sessions?page=${page + 1}&limit=${rowsPerPage}&status=${statusFilter !== 'all' ? statusFilter : ''}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/admin/statistics', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setSessions(sessionsRes.data.sessions);
      setStatistics(statsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again.');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, page, rowsPerPage, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = useCallback(async (sessionId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/admin/sessions/${sessionId}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchData();
    } catch (err) {
      console.error('Error updating session status:', err);
      setError('Failed to update session status');
    }
  }, [fetchData]);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const StatCard = useMemo(() => {
    return ({ title, value, color }) => (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ color }}>
            {value}
          </Typography>
        </CardContent>
      </Card>
    );
  }, []);

  if (loading && !sessions.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <StatCard title="Total Sessions" value={statistics.totalSessions} color="primary.main" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Ongoing Sessions" value={statistics.ongoingSessions} color="info.main" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Completed Sessions" value={statistics.completedSessions} color="success.main" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Rejected Sessions" value={statistics.rejectedSessions} color="error.main" />
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Sessions</Typography>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="ongoing">Ongoing</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Mentor</TableCell>
                    <TableCell>Mentee</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell>{session._id}</TableCell>
                      <TableCell>{session.mentor?.name}</TableCell>
                      <TableCell>{session.mentee?.name}</TableCell>
                      <TableCell>{session.status}</TableCell>
                      <TableCell>{new Date(session.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleStatusChange(session._id, 'completed')}
                          disabled={session.status === 'completed'}
                        >
                          Complete
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleStatusChange(session._id, 'rejected')}
                          disabled={session.status === 'rejected'}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={statistics.totalSessions}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard; 