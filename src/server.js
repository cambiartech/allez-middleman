const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const authMiddleware = require('./middleware/auth');
const tripController = require('./controllers/tripController');
const socketHandler = require('./handlers/socketHandler');

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
};

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: io.engine.clientsCount
  });
});

// === TRIP LIFECYCLE ENDPOINTS ===

// 1. Trip sent to drivers (when a trip request is created and sent to nearby drivers)
app.post('/api/trip/send-to-drivers', authMiddleware.validateBackendAuth, tripController.sendTripToDrivers(io));

// 2. Trip accepted by driver
app.post('/api/trip/accepted', authMiddleware.validateBackendAuth, tripController.tripAccepted(io));

// 3. Trip no longer available (cancelled, accepted by another driver, expired)
app.post('/api/trip/no-longer-available', authMiddleware.validateBackendAuth, tripController.tripNoLongerAvailable(io));

// 4. Driver arrived for pickup
app.post('/api/trip/driver-arrived', authMiddleware.validateBackendAuth, tripController.driverArrived(io));

// 5. Trip started (rider picked up)
app.post('/api/trip/started', authMiddleware.validateBackendAuth, tripController.tripStarted(io));

// 6. Trip completed
app.post('/api/trip/completed', authMiddleware.validateBackendAuth, tripController.tripCompleted(io));

// 7. Trip cancelled
app.post('/api/trip/cancelled', authMiddleware.validateBackendAuth, tripController.tripCancelled(io));

// 8. Driver location updates during trip
app.post('/api/driver/location-update', authMiddleware.validateBackendAuth, tripController.updateDriverLocation(io));

// 9. Payment processing updates
app.post('/api/payment/update', authMiddleware.validateBackendAuth, tripController.paymentUpdate(io));

// 10. Emergency/SOS alerts
app.post('/api/emergency/alert', authMiddleware.validateBackendAuth, tripController.emergencyAlert(io));

// === LEGACY ENDPOINTS (for backward compatibility) ===

// Trip status update endpoint (from Laravel backend)
app.post('/api/trip/update', authMiddleware.validateBackendAuth, tripController.updateTripStatus(io));

// Trip request endpoint (from Laravel backend)
app.post('/api/trip/request', authMiddleware.validateBackendAuth, tripController.createTripRequest(io));

// Driver location update endpoint (legacy)
app.post('/api/driver/location', authMiddleware.validateBackendAuth, tripController.legacyUpdateDriverLocation(io));

// Socket.IO connection handling
io.use(authMiddleware.validateSocketAuth);
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket, io);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`Allez Middleman Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io }; 