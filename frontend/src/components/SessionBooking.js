import React, { useState } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const SessionBooking = ({ teacher, onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    skill: '',
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
    notes: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDateChange = (field) => (newValue) => {
    setFormData({
      ...formData,
      [field]: newValue
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          teacher: teacher._id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book session');
      }

      onSuccess(data);
    } catch (error) {
      setError(error.message);
    }
  };

  const teachableSkills = teacher.skills.filter(
    skill => skill.level === 'Advanced' || skill.level === 'Expert'
  );

  return (
    <>
      <DialogTitle sx={{ color: '#FF9F43' }}>
        Book Session with {teacher.name}
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Skill</InputLabel>
            <Select
              name="skill"
              value={formData.skill}
              onChange={handleChange}
              required
              label="Skill"
            >
              {teachableSkills.map((skill, index) => (
                <MenuItem key={index} value={skill.name}>
                  {skill.name} ({skill.level})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ mb: 2 }}>
              <DateTimePicker
                label="Start Time"
                value={formData.startTime}
                onChange={handleDateChange('startTime')}
                renderInput={(params) => <TextField {...params} fullWidth />}
                minDateTime={new Date()}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <DateTimePicker
                label="End Time"
                value={formData.endTime}
                onChange={handleDateChange('endTime')}
                renderInput={(params) => <TextField {...params} fullWidth />}
                minDateTime={formData.startTime}
              />
            </Box>
          </LocalizationProvider>

          <TextField
            fullWidth
            multiline
            rows={4}
            name="notes"
            label="Notes (optional)"
            value={formData.notes}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#FF9F43' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{
            backgroundColor: '#FF9F43',
            '&:hover': {
              backgroundColor: '#FF8F2A',
            }
          }}
        >
          Book Session
        </Button>
      </DialogActions>
    </>
  );
};

export default SessionBooking; 