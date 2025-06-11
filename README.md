# SkillSwap - Peer-to-Peer Learning Platform

SkillSwap is a web application that enables users to exchange skills through peer-to-peer learning sessions. Users can offer their expertise in various skills and learn from others in return.

## Features

- User authentication (JWT-based)
- Profile management with skills listing
- Session scheduling and management
- Real-time chat between matched users
- Ratings and reviews system
- Skill-based user search

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication

### Frontend
- React.js
- Material-UI for components
- React Router for navigation
- Axios for API calls
- Socket.IO client for real-time features

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/skillswap.git
cd skillswap
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Create a `.env` file in the backend directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skillswap
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
```

### Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- POST `/api/users/register` - Register a new user
- POST `/api/users/login` - Login user

### User Profile
- GET `/api/users/profile` - Get user profile
- PATCH `/api/users/profile` - Update user profile
- GET `/api/users/search` - Search users by skill

### Sessions
- POST `/api/sessions` - Create a new session
- GET `/api/sessions/my-sessions` - Get user's sessions
- PATCH `/api/sessions/:id` - Update session status
- GET `/api/sessions/:id` - Get session details

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 