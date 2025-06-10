// Entry point for Elastic Beanstalk - Robust version
const express = require('express');
const http = require('http');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware for HTTP requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ALLOWED_ORIGINS.split(',');
  
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Environment variables (directly from AWS, no .env file needed)
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'production';
const JWT_SECRET = process.env.JWT_SECRET || '7Z*hVKw<K=Y2}(S{n03YBU3lE?^|b!';
const LARAVEL_API_KEY = process.env.LARAVEL_API_KEY || 'HKeGw>L/v9-3W4/';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://dev.allezadmin.com,https://allezadmin.com,http://localhost:8081,http://10.0.2.2:8081';

// Simple logging function
const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

// Initialize Socket.IO with error handling
let io;
try {
  const socketIo = require('socket.io');
  io = socketIo(server, {
    cors: {
      origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = ALLOWED_ORIGINS.split(',');
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Allow any localhost or IP addresses for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('10.0.2.2')) {
          return callback(null, true);
        }
        
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });
  log('Socket.IO initialized successfully');
} catch (error) {
  log('Socket.IO initialization failed, continuing without WebSocket support');
  io = null;
}

// Simple auth middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== LARAVEL_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    socketio: io ? 'enabled' : 'disabled',
    connections: io ? io.engine.clientsCount : 0
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Allez Middleman Server',
    status: 'running',
    version: '1.0.0',
    features: {
      websocket: io ? true : false,
      api: true
    }
  });
});

// === TRIP LIFECYCLE ENDPOINTS ===

// 1. Trip sent to drivers
app.post('/api/trip/send-to-drivers', validateApiKey, (req, res) => {
  const { tripId, riderId, driverIds, tripData } = req.body;
  
  if (io) {
    // Broadcast to specific drivers
    driverIds.forEach(driverId => {
      io.to(`user_${driverId}`).emit('trip_request', {
        tripId,
        riderId,
        tripData,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  log(`Trip ${tripId} sent to ${driverIds.length} drivers`);
  res.json({ success: true, message: 'Trip sent to drivers', tripId });
});

// 2. Trip accepted by driver
app.post('/api/trip/accept', validateApiKey, (req, res) => {
  const { tripId, driverId, riderId } = req.body;
  
  if (io) {
    // Notify rider
    io.to(`user_${riderId}`).emit('trip_accepted', {
      tripId,
      driverId,
      timestamp: new Date().toISOString()
    });
    
    // Notify driver
    io.to(`user_${driverId}`).emit('trip_accepted_confirmation', {
      tripId,
      riderId,
      timestamp: new Date().toISOString()
    });
  }
  
  log(`Trip ${tripId} accepted by driver ${driverId}`);
  res.json({ success: true, message: 'Trip accepted', tripId, driverId });
});

// 3. Trip no longer available
app.post('/api/trip/no-longer-available', validateApiKey, (req, res) => {
  const { tripId, driverIds, reason } = req.body;
  
  if (io) {
    driverIds.forEach(driverId => {
      io.to(`user_${driverId}`).emit('trip_unavailable', {
        tripId,
        reason,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  log(`Trip ${tripId} no longer available: ${reason}`);
  res.json({ success: true, message: 'Drivers notified', tripId });
});

// 4. Driver arrived
app.post('/api/trip/driver-arrived', validateApiKey, (req, res) => {
  const { tripId, driverId, riderId } = req.body;
  
  if (io) {
    io.to(`user_${riderId}`).emit('driver_arrived', {
      tripId,
      driverId,
      timestamp: new Date().toISOString()
    });
  }
  
  log(`Driver ${driverId} arrived for trip ${tripId}`);
  res.json({ success: true, message: 'Rider notified of arrival', tripId });
});

// 5. Trip started
app.post('/api/trip/started', validateApiKey, (req, res) => {
  const { tripId, driverId, riderId } = req.body;
  
  if (io) {
    // Notify both parties
    io.to(`user_${riderId}`).emit('trip_started', {
      tripId,
      driverId,
      timestamp: new Date().toISOString()
    });
    
    io.to(`user_${driverId}`).emit('trip_started', {
      tripId,
      riderId,
      timestamp: new Date().toISOString()
    });
  }
  
  log(`Trip ${tripId} started`);
  res.json({ success: true, message: 'Trip started', tripId });
});

// 6. Trip completed
app.post('/api/trip/completed', validateApiKey, (req, res) => {
  const { tripId, driverId, riderId, fare } = req.body;
  
  if (io) {
    // Notify both parties
    io.to(`user_${riderId}`).emit('trip_completed', {
      tripId,
      driverId,
      fare,
      timestamp: new Date().toISOString()
    });
    
    io.to(`user_${driverId}`).emit('trip_completed', {
      tripId,
      riderId,
      fare,
      timestamp: new Date().toISOString()
    });
  }
  
  log(`Trip ${tripId} completed with fare ${fare}`);
  res.json({ success: true, message: 'Trip completed', tripId, fare });
});

// 7. Trip cancelled
app.post('/api/trip/cancel', validateApiKey, (req, res) => {
  const { tripId, cancelledBy, reason, driverId, riderId } = req.body;
  
  if (io) {
    const cancelData = {
      tripId,
      cancelledBy,
      reason,
      timestamp: new Date().toISOString()
    };
    
    if (driverId) io.to(`user_${driverId}`).emit('trip_cancelled', cancelData);
    if (riderId) io.to(`user_${riderId}`).emit('trip_cancelled', cancelData);
  }
  
  log(`Trip ${tripId} cancelled by ${cancelledBy}: ${reason}`);
  res.json({ success: true, message: 'Trip cancelled', tripId });
});

// 8. Driver location updates
app.post('/api/trip/driver-location', validateApiKey, (req, res) => {
  const { driverId, tripId, latitude, longitude } = req.body;
  
  if (io && tripId) {
    io.to(`trip_${tripId}`).emit('driver_location', {
      driverId,
      tripId,
      location: { latitude, longitude },
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({ success: true, message: 'Location updated', driverId });
});

// 9. Payment updates
app.post('/api/payment/update', validateApiKey, (req, res) => {
  const { tripId, status, amount, riderId, driverId } = req.body;
  
  if (io) {
    const paymentData = {
      tripId,
      status,
      amount,
      timestamp: new Date().toISOString()
    };
    
    if (riderId) io.to(`user_${riderId}`).emit('payment_update', paymentData);
    if (driverId) io.to(`user_${driverId}`).emit('payment_update', paymentData);
  }
  
  log(`Payment update for trip ${tripId}: ${status}`);
  res.json({ success: true, message: 'Payment update sent', tripId });
});

// 10. Emergency alerts
app.post('/api/emergency/alert', validateApiKey, (req, res) => {
  const { tripId, userId, type, location } = req.body;
  
  if (io) {
    // Broadcast emergency to all relevant parties
    io.to(`trip_${tripId}`).emit('emergency_alert', {
      tripId,
      userId,
      type,
      location,
      timestamp: new Date().toISOString()
    });
  }
  
  log(`EMERGENCY ALERT - Trip ${tripId}, User ${userId}, Type: ${type}`);
  res.json({ success: true, message: 'Emergency alert sent', tripId });
});

// === LEGACY ENDPOINTS (for backward compatibility) ===

// Trip status update endpoint (from Laravel backend)
app.post('/api/trip/update', validateApiKey, (req, res) => {
  const { tripId, status, driverId, riderId } = req.body;
  
  if (io) {
    const updateData = {
      tripId,
      status,
      timestamp: new Date().toISOString()
    };
    
    if (riderId) io.to(`user_${riderId}`).emit('trip_update', updateData);
    if (driverId) io.to(`user_${driverId}`).emit('trip_update', updateData);
  }
  
  log(`Trip ${tripId} status updated to ${status}`);
  res.json({ success: true, message: 'Trip status updated', tripId });
});

// Trip request endpoint (from Laravel backend)
app.post('/api/trip/request', validateApiKey, (req, res) => {
  const { tripId, riderId, driverIds, tripData } = req.body;
  
  if (io) {
    driverIds.forEach(driverId => {
      io.to(`user_${driverId}`).emit('trip_request', {
        tripId,
        riderId,
        tripData,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  log(`Trip request ${tripId} sent to ${driverIds.length} drivers`);
  res.json({ success: true, message: 'Trip request sent', tripId });
});

// Driver location update endpoint (legacy)
app.post('/api/driver/location', validateApiKey, (req, res) => {
  const { driverId, tripId, latitude, longitude } = req.body;
  
  if (io && tripId) {
    io.to(`trip_${tripId}`).emit('driver_location', {
      driverId,
      tripId,
      location: { latitude, longitude },
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({ success: true, message: 'Driver location updated', driverId });
});

// Socket.IO connection handling
if (io) {
  io.on('connection', (socket) => {
    log(`Client connected: ${socket.id}`);
    
    // Handle authentication
    socket.on('authenticate', (data) => {
      const { token, userId } = data;
      
      if (token) {
        try {
          // For now, we'll accept any token and extract userId
          // In production, you'd verify the JWT token here
          socket.userId = userId;
          socket.authenticated = true;
          socket.emit('authenticated', { success: true, userId });
          log(`User ${userId} authenticated with socket ${socket.id}`);
        } catch (error) {
          socket.emit('authentication_error', { error: 'Invalid token' });
          log(`Authentication failed for socket ${socket.id}: ${error.message}`);
        }
      } else {
        // Allow unauthenticated connections for testing
        socket.authenticated = true;
        socket.emit('authenticated', { success: true });
        log(`Unauthenticated connection allowed: ${socket.id}`);
      }
    });
    
    // Join user room (with or without authentication)
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
      socket.userId = userId;
      socket.emit('joined_room', { room: `user_${userId}` });
      log(`User ${userId} joined room with socket ${socket.id}`);
    });
    
    // Join trip room
    socket.on('join_trip_room', (tripId) => {
      socket.join(`trip_${tripId}`);
      socket.emit('joined_room', { room: `trip_${tripId}` });
      log(`Socket ${socket.id} joined trip ${tripId}`);
    });
    
    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });
    
    // Send initial connection confirmation
    socket.emit('connected', { 
      socketId: socket.id, 
      timestamp: new Date().toISOString() 
    });
  });
}

// Error handling
app.use((err, req, res, next) => {
  log(`Error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
  log(`Allez Middleman Server running on port ${PORT}`);
  log(`Environment: ${NODE_ENV}`);
  log(`Socket.IO: ${io ? 'enabled' : 'disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    log('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io }; 