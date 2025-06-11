import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  background: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  boxShadow: "0 8px 32px rgba(255, 159, 67, 0.1)",
  border: "1px solid rgba(255, 159, 67, 0.1)",
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 1)",
      boxShadow: "0 4px 12px rgba(255, 159, 67, 0.1)",
    },
    "&.Mui-focused": {
      boxShadow: "0 4px 12px rgba(255, 159, 67, 0.2)",
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(255, 159, 67, 0.2)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(255, 159, 67, 0.4)",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#FF9F43",
  },
  marginBottom: theme.spacing(2),
}));

const Profile = () => {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    bio: "",
    skills: [],
  });
  const [newSkill, setNewSkill] = useState({ name: "", level: "Beginner" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/users/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // <-- Add this line
        },
      });
      setProfile(response.data);
    } catch (error) {
      setError("Failed to fetch profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSkillChange = (e) => {
    setNewSkill({
      ...newSkill,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddSkill = () => {
    if (!newSkill.name.trim()) {
      setError("Skill name cannot be empty");
      return;
    }

    if (
      profile.skills.some(
        (skill) => skill.name.toLowerCase() === newSkill.name.toLowerCase()
      )
    ) {
      setError("Skill already exists");
      return;
    }

    setProfile({
      ...profile,
      skills: [...profile.skills, { ...newSkill }],
    });
    setNewSkill({ name: "", level: "Beginner" });
  };

  const handleRemoveSkill = (index) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!profile.name.trim() || !profile.email.trim()) {
      setError("Name and email are required");
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      // Only send the fields that have changed
      const updates = {
        name: profile.name,
        bio: profile.bio,
        skills: profile.skills.map((skill) => ({
          name: skill.name,
          level:
            skill.level.charAt(0).toUpperCase() +
            skill.level.slice(1).toLowerCase(),
        })),
      };

      const response = await axios.patch(
        "http://localhost:5000/api/users/profile",
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setProfile(response.data);
      setSuccess("Profile updated successfully");
    } catch (error) {
      setError(error.response?.data?.error || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress sx={{ color: "#FF9F43" }} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <StyledPaper elevation={3}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            color: "#FF9F43",
            fontWeight: 600,
            textAlign: "center",
            mb: 4,
          }}
        >
          Profile
        </Typography>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity="error"
            onClose={() => setError("")}
            sx={{
              backgroundColor: "#FFE4E4",
              color: "#FF5252",
              "& .MuiAlert-icon": {
                color: "#FF5252",
              },
            }}
          >
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity="success"
            onClose={() => setSuccess("")}
            sx={{
              backgroundColor: "#E6FFE6",
              color: "#4CAF50",
              "& .MuiAlert-icon": {
                color: "#4CAF50",
              },
            }}
          >
            {success}
          </Alert>
        </Snackbar>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <StyledTextField
                fullWidth
                label="Name"
                name="name"
                value={profile.name}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <StyledTextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <StyledTextField
                fullWidth
                label="Bio"
                name="bio"
                multiline
                rows={4}
                value={profile.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ color: "#FF9F43", mb: 2 }}>
                Skills
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {profile.skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={`${skill.name} (${skill.level})`}
                    onDelete={() => handleRemoveSkill(index)}
                    sx={{
                      backgroundColor: "rgba(255, 159, 67, 0.1)",
                      color: "#FF9F43",
                      "& .MuiChip-deleteIcon": {
                        color: "#FF9F43",
                        "&:hover": {
                          color: "#FF8F2A",
                        },
                      },
                    }}
                  />
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <StyledTextField
                  label="New Skill"
                  name="name"
                  value={newSkill.name}
                  onChange={handleSkillChange}
                  sx={{ flex: 1 }}
                />
                <FormControl sx={{ width: "150px" }}>
                  <InputLabel id="skill-level-label">Level</InputLabel>
                  <Select
                    labelId="skill-level-label"
                    id="skill-level"
                    name="level"
                    value={newSkill.level}
                    onChange={handleSkillChange}
                    label="Level"
                    sx={{
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255, 159, 67, 0.2)",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255, 159, 67, 0.4)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#FF9F43",
                      },
                    }}
                  >
                    <MenuItem value="Beginner">Beginner</MenuItem>
                    <MenuItem value="Intermediate">Intermediate</MenuItem>
                    <MenuItem value="Advanced">Advanced</MenuItem>
                    <MenuItem value="Expert">Expert</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  onClick={handleAddSkill}
                  startIcon={<AddIcon />}
                  sx={{
                    backgroundColor: "#FF9F43",
                    "&:hover": {
                      backgroundColor: "#FF8F2A",
                    },
                  }}
                >
                  Add
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: 2,
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    backgroundColor: "#FF9F43",
                    color: "white",
                    padding: "12px 32px",
                    borderRadius: "12px",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: "#FF8F2A",
                    },
                  }}
                >
                  Save Profile
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </StyledPaper>
    </Container>
  );
};

export default Profile;
