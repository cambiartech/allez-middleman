/**
 * Frontend Client Example for Allez Middleman Server
 * 
 * This example shows how to connect your frontend application
 * (React, Vue, Angular, or vanilla JS) to the real-time server.
 */

import { io } from 'socket.io-client';

class AllezRealtimeClient {
  constructor(serverUrl = 'http://localhost:3001', authToken = null) {
    this.serverUrl = serverUrl;
    this.authToken = authToken;
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  /**
   * Connect to the middleman server
   */
  connect(userToken) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(this.serverUrl, {
      auth: {
        token: userToken
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    return this;
  }

  /**
   * Setup default event handlers
   */
  setupEventHandlers() {
    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to Allez Middleman Server');
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('Disconnected from server:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      this.emit('connection_error', error);
    });

    // Server confirmation
    this.socket.on('connected', (data) => {
      console.log('Server confirmation:', data);
      this.emit('server_connected', data);
    });

    // Trip-related events
    this.socket.on('trip_status_update', (data) => {
      console.log('Trip status update:', data);
      this.emit('trip_status_update', data);
    });

    this.socket.on('new_trip_request', (data) => {
      console.log('New trip request:', data);
      this.emit('new_trip_request', data);
    });

    this.socket.on('trip_request_created', (data) => {
      console.log('Trip request created:', data);
      this.emit('trip_request_created', data);
    });

    this.socket.on('trip_accepted', (data) => {
      console.log('Trip accepted:', data);
      this.emit('trip_accepted', data);
    });

    // Driver-related events
    this.socket.on('driver_location_update', (data) => {
      console.log('Driver location update:', data);
      this.emit('driver_location_update', data);
    });

    // Subscription confirmations
    this.socket.on('trip_subscribed', (data) => {
      console.log('Subscribed to trip:', data);
      this.emit('trip_subscribed', data);
    });

    this.socket.on('driver_tracking_started', (data) => {
      console.log('Driver tracking started:', data);
      this.emit('driver_tracking_started', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });

    // Heartbeat
    this.socket.on('pong', (data) => {
      this.emit('pong', data);
    });
  }

  /**
   * Subscribe to trip updates
   */
  subscribeToTrip(tripId) {
    if (!this.isConnected) {
      console.warn('Not connected to server');
      return false;
    }

    this.socket.emit('subscribe_trip', { trip_id: tripId });
    return true;
  }

  /**
   * Unsubscribe from trip updates
   */
  unsubscribeFromTrip(tripId) {
    if (!this.isConnected) {
      console.warn('Not connected to server');
      return false;
    }

    this.socket.emit('unsubscribe_trip', { trip_id: tripId });
    return true;
  }

  /**
   * Toggle driver availability (for driver clients)
   */
  toggleAvailability(isAvailable) {
    if (!this.isConnected) {
      console.warn('Not connected to server');
      return false;
    }

    this.socket.emit('toggle_availability', { is_available: isAvailable });
    return true;
  }

  /**
   * Track a specific driver's location
   */
  trackDriver(driverId) {
    if (!this.isConnected) {
      console.warn('Not connected to server');
      return false;
    }

    this.socket.emit('track_driver', { driver_id: driverId });
    return true;
  }

  /**
   * Accept a trip (for driver clients)
   */
  acceptTrip(tripId, estimatedArrival = null) {
    if (!this.isConnected) {
      console.warn('Not connected to server');
      return false;
    }

    this.socket.emit('accept_trip', { 
      trip_id: tripId, 
      estimated_arrival: estimatedArrival 
    });
    return true;
  }

  /**
   * Reject a trip (for driver clients)
   */
  rejectTrip(tripId, reason = null) {
    if (!this.isConnected) {
      console.warn('Not connected to server');
      return false;
    }

    this.socket.emit('reject_trip', { 
      trip_id: tripId, 
      reason: reason 
    });
    return true;
  }

  /**
   * Send heartbeat to server
   */
  ping() {
    if (!this.isConnected) {
      return false;
    }

    this.socket.emit('ping');
    return true;
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
    return this;
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) {
      return this;
    }

    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
    return this;
  }

  /**
   * Emit event to registered handlers
   */
  emit(event, data = null) {
    if (!this.eventHandlers.has(event)) {
      return;
    }

    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      serverUrl: this.serverUrl
    };
  }
}

export default AllezRealtimeClient;