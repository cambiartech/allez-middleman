const logger = require('../utils/logger');

/**
 * Handle new WebSocket connections
 */
function handleConnection(socket, io) {
  const { userId, userType, userEmail } = socket;
  
  logger.info('Client connected', { 
    socketId: socket.id, 
    userId, 
    userType, 
    userEmail 
  });

  // Join user to their personal room
  const userRoom = `user_${userId}`;
  socket.join(userRoom);

  // Join drivers to available drivers room if they're available
  if (userType === 'driver') {
    socket.join('available_drivers');
  }

  // Send connection confirmation
  socket.emit('connected', {
    message: 'Connected to Allez Middleman Server',
    userId,
    userType,
    timestamp: new Date().toISOString()
  });

  // Handle trip subscription
  socket.on('subscribe_trip', (data) => {
    handleTripSubscription(socket, data);
  });

  // Handle trip unsubscription
  socket.on('unsubscribe_trip', (data) => {
    handleTripUnsubscription(socket, data);
  });

  // Handle driver availability toggle
  socket.on('toggle_availability', (data) => {
    handleDriverAvailability(socket, data);
  });

  // Handle driver location tracking subscription
  socket.on('track_driver', (data) => {
    handleDriverTracking(socket, data);
  });

  // Handle trip acceptance (driver accepting a trip request)
  socket.on('accept_trip', (data) => {
    handleTripAcceptance(socket, io, data);
  });

  // Handle trip rejection (driver rejecting a trip request)
  socket.on('reject_trip', (data) => {
    handleTripRejection(socket, io, data);
  });

  // Handle client heartbeat/ping
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    handleDisconnection(socket, reason);
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error('Socket error', { 
      socketId: socket.id, 
      userId, 
      error: error.message 
    });
  });
}

/**
 * Handle trip subscription (client wants to receive updates for a specific trip)
 */
function handleTripSubscription(socket, data) {
  const { trip_id } = data;
  
  if (!trip_id) {
    socket.emit('error', { message: 'trip_id is required for subscription' });
    return;
  }

  const tripRoom = `trip_${trip_id}`;
  socket.join(tripRoom);

  logger.info('Client subscribed to trip', { 
    socketId: socket.id, 
    userId: socket.userId, 
    trip_id 
  });

  socket.emit('trip_subscribed', { 
    trip_id, 
    message: 'Successfully subscribed to trip updates' 
  });
}

/**
 * Handle trip unsubscription
 */
function handleTripUnsubscription(socket, data) {
  const { trip_id } = data;
  
  if (!trip_id) {
    socket.emit('error', { message: 'trip_id is required for unsubscription' });
    return;
  }

  const tripRoom = `trip_${trip_id}`;
  socket.leave(tripRoom);

  logger.info('Client unsubscribed from trip', { 
    socketId: socket.id, 
    userId: socket.userId, 
    trip_id 
  });

  socket.emit('trip_unsubscribed', { 
    trip_id, 
    message: 'Successfully unsubscribed from trip updates' 
  });
}

/**
 * Handle driver availability toggle
 */
function handleDriverAvailability(socket, data) {
  if (socket.userType !== 'driver') {
    socket.emit('error', { message: 'Only drivers can toggle availability' });
    return;
  }

  const { is_available } = data;
  
  if (is_available) {
    socket.join('available_drivers');
    logger.info('Driver became available', { 
      socketId: socket.id, 
      userId: socket.userId 
    });
  } else {
    socket.leave('available_drivers');
    logger.info('Driver became unavailable', { 
      socketId: socket.id, 
      userId: socket.userId 
    });
  }

  socket.emit('availability_updated', { 
    is_available, 
    message: `Driver availability set to ${is_available ? 'available' : 'unavailable'}` 
  });
}

/**
 * Handle driver location tracking subscription
 */
function handleDriverTracking(socket, data) {
  const { driver_id } = data;
  
  if (!driver_id) {
    socket.emit('error', { message: 'driver_id is required for tracking' });
    return;
  }

  const trackingRoom = `track_driver_${driver_id}`;
  socket.join(trackingRoom);

  logger.info('Client subscribed to driver tracking', { 
    socketId: socket.id, 
    userId: socket.userId, 
    driver_id 
  });

  socket.emit('driver_tracking_started', { 
    driver_id, 
    message: 'Successfully subscribed to driver location updates' 
  });
}

/**
 * Handle trip acceptance by driver
 */
function handleTripAcceptance(socket, io, data) {
  if (socket.userType !== 'driver') {
    socket.emit('error', { message: 'Only drivers can accept trips' });
    return;
  }

  const { trip_id, estimated_arrival } = data;
  
  if (!trip_id) {
    socket.emit('error', { message: 'trip_id is required' });
    return;
  }

  const acceptanceData = {
    trip_id,
    driver_id: socket.userId,
    status: 'accepted',
    estimated_arrival,
    timestamp: new Date().toISOString()
  };

  // Broadcast acceptance to trip room
  const tripRoom = `trip_${trip_id}`;
  io.to(tripRoom).emit('trip_accepted', acceptanceData);

  logger.info('Trip accepted by driver', { 
    trip_id, 
    driver_id: socket.userId,
    socketId: socket.id 
  });

  socket.emit('trip_acceptance_confirmed', acceptanceData);
}

/**
 * Handle trip rejection by driver
 */
function handleTripRejection(socket, io, data) {
  if (socket.userType !== 'driver') {
    socket.emit('error', { message: 'Only drivers can reject trips' });
    return;
  }

  const { trip_id, reason } = data;
  
  if (!trip_id) {
    socket.emit('error', { message: 'trip_id is required' });
    return;
  }

  const rejectionData = {
    trip_id,
    driver_id: socket.userId,
    reason: reason || 'No reason provided',
    timestamp: new Date().toISOString()
  };

  logger.info('Trip rejected by driver', { 
    trip_id, 
    driver_id: socket.userId,
    reason,
    socketId: socket.id 
  });

  socket.emit('trip_rejection_confirmed', rejectionData);
}

/**
 * Handle client disconnection
 */
function handleDisconnection(socket, reason) {
  logger.info('Client disconnected', { 
    socketId: socket.id, 
    userId: socket.userId, 
    userType: socket.userType,
    reason 
  });

  // Clean up any specific resources if needed
  // Socket.IO automatically handles room cleanup
}

/**
 * Get connection statistics
 */
function getConnectionStats(io) {
  return {
    total_connections: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  handleConnection,
  getConnectionStats
}; 