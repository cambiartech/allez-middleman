const logger = require('../utils/logger');

/**
 * Handle trip status updates from Laravel backend
 */
const updateTripStatus = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        status, 
        driver_id, 
        rider_id, 
        driver_location,
        estimated_arrival,
        trip_data 
      } = req.body;

      // Validate required fields
      if (!trip_id || !status) {
        return res.status(400).json({ 
          error: 'trip_id and status are required' 
        });
      }

      const updateData = {
        trip_id,
        status,
        driver_id,
        rider_id,
        driver_location,
        estimated_arrival,
        trip_data,
        timestamp: new Date().toISOString()
      };

      logger.info('Trip status update received', updateData);

      // Broadcast to relevant users
      await broadcastTripUpdate(io, updateData);

      res.json({ 
        success: true, 
        message: 'Trip status updated successfully',
        trip_id 
      });

    } catch (error) {
      logger.error('Error updating trip status:', error);
      res.status(500).json({ error: 'Failed to update trip status' });
    }
  };
};

/**
 * Handle new trip requests from Laravel backend
 */
const createTripRequest = (io) => {
  return async (req, res) => {
    try {
      const {
        trip_id,
        rider_id,
        pickup_location,
        destination,
        fare_estimate,
        trip_type,
        nearby_drivers,
        trip_data
      } = req.body;

      // Validate required fields
      if (!trip_id || !rider_id || !pickup_location) {
        return res.status(400).json({ 
          error: 'trip_id, rider_id, and pickup_location are required' 
        });
      }

      const requestData = {
        trip_id,
        rider_id,
        pickup_location,
        destination,
        fare_estimate,
        trip_type: trip_type || 'standard',
        nearby_drivers: nearby_drivers || [],
        trip_data,
        status: 'requested',
        timestamp: new Date().toISOString()
      };

      logger.info('New trip request received', requestData);

      // Broadcast to nearby drivers and the rider
      await broadcastTripRequest(io, requestData);

      res.json({ 
        success: true, 
        message: 'Trip request broadcasted successfully',
        trip_id 
      });

    } catch (error) {
      logger.error('Error creating trip request:', error);
      res.status(500).json({ error: 'Failed to create trip request' });
    }
  };
};

/**
 * Handle driver location updates from Laravel backend (legacy endpoint)
 */
const legacyUpdateDriverLocation = (io) => {
  return async (req, res) => {
    try {
      const {
        driver_id,
        location,
        heading,
        speed,
        is_available,
        current_trip_id
      } = req.body;

      // Validate required fields
      if (!driver_id || !location) {
        return res.status(400).json({ 
          error: 'driver_id and location are required' 
        });
      }

      const locationData = {
        driver_id,
        location,
        heading,
        speed,
        is_available: is_available !== undefined ? is_available : true,
        current_trip_id,
        timestamp: new Date().toISOString()
      };

      logger.info('Driver location update received', { driver_id, location });

      // Broadcast to relevant users (riders in active trips with this driver)
      await broadcastDriverLocation(io, locationData);

      res.json({ 
        success: true, 
        message: 'Driver location updated successfully',
        driver_id 
      });

    } catch (error) {
      logger.error('Error updating driver location:', error);
      res.status(500).json({ error: 'Failed to update driver location' });
    }
  };
};

/**
 * Broadcast trip status updates to relevant connected clients
 */
async function broadcastTripUpdate(io, updateData) {
  const { trip_id, driver_id, rider_id, status } = updateData;

  // Create room names for targeted broadcasting
  const tripRoom = `trip_${trip_id}`;
  const driverRoom = driver_id ? `user_${driver_id}` : null;
  const riderRoom = rider_id ? `user_${rider_id}` : null;

  // Broadcast to trip room (anyone subscribed to this specific trip)
  io.to(tripRoom).emit('trip_status_update', updateData);

  // Broadcast to specific users
  if (driverRoom) {
    io.to(driverRoom).emit('trip_status_update', updateData);
  }
  if (riderRoom) {
    io.to(riderRoom).emit('trip_status_update', updateData);
  }

  logger.info('Trip update broadcasted', { 
    trip_id, 
    status, 
    rooms: [tripRoom, driverRoom, riderRoom].filter(Boolean) 
  });
}

/**
 * Broadcast new trip requests to nearby drivers and the requesting rider
 */
async function broadcastTripRequest(io, requestData) {
  const { trip_id, rider_id, nearby_drivers } = requestData;

  // Broadcast to the rider
  const riderRoom = `user_${rider_id}`;
  io.to(riderRoom).emit('trip_request_created', requestData);

  // Broadcast to nearby drivers
  if (nearby_drivers && nearby_drivers.length > 0) {
    nearby_drivers.forEach(driverId => {
      const driverRoom = `user_${driverId}`;
      io.to(driverRoom).emit('new_trip_request', requestData);
    });
  }

  // Also broadcast to general driver pool (drivers who are listening for requests)
  io.to('available_drivers').emit('new_trip_request', requestData);

  logger.info('Trip request broadcasted', { 
    trip_id, 
    rider_id, 
    nearby_drivers_count: nearby_drivers?.length || 0 
  });
}

/**
 * Broadcast driver location updates to relevant riders
 */
async function broadcastDriverLocation(io, locationData) {
  const { driver_id, current_trip_id } = locationData;

  // If driver is on a trip, broadcast to the rider
  if (current_trip_id) {
    const tripRoom = `trip_${current_trip_id}`;
    io.to(tripRoom).emit('driver_location_update', locationData);
  }

  // Broadcast to anyone specifically tracking this driver
  const driverTrackingRoom = `track_driver_${driver_id}`;
  io.to(driverTrackingRoom).emit('driver_location_update', locationData);

  logger.info('Driver location broadcasted', { 
    driver_id, 
    current_trip_id,
    has_active_trip: !!current_trip_id 
  });
}

/**
 * 1. Handle trip requests sent to drivers
 */
const sendTripToDrivers = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        rider_id, 
        pickup_location,
        destination,
        fare_estimate,
        trip_type,
        nearby_drivers,
        trip_data,
        expires_at
      } = req.body;

      // Validate required fields
      if (!trip_id || !rider_id || !pickup_location || !nearby_drivers) {
        return res.status(400).json({ 
          error: 'trip_id, rider_id, pickup_location, and nearby_drivers are required' 
        });
      }

      const requestData = {
        trip_id,
        rider_id,
        pickup_location,
        destination,
        fare_estimate,
        trip_type: trip_type || 'standard',
        nearby_drivers: nearby_drivers || [],
        trip_data,
        status: 'sent_to_drivers',
        expires_at: expires_at || new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes default
        timestamp: new Date().toISOString()
      };

      logger.info('Trip sent to drivers', requestData);

      // Broadcast to nearby drivers and the rider
      await broadcastTripToDrivers(io, requestData);

      res.json({ 
        success: true, 
        message: 'Trip sent to drivers successfully',
        trip_id,
        drivers_notified: nearby_drivers.length
      });

    } catch (error) {
      logger.error('Error sending trip to drivers:', error);
      res.status(500).json({ error: 'Failed to send trip to drivers' });
    }
  };
};

/**
 * 2. Handle trip acceptance by driver
 */
const tripAccepted = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        driver_id, 
        rider_id,
        estimated_arrival,
        driver_location,
        driver_info
      } = req.body;

      // Validate required fields
      if (!trip_id || !driver_id || !rider_id) {
        return res.status(400).json({ 
          error: 'trip_id, driver_id, and rider_id are required' 
        });
      }

      const acceptanceData = {
        trip_id,
        driver_id,
        rider_id,
        status: 'accepted',
        estimated_arrival,
        driver_location,
        driver_info,
        timestamp: new Date().toISOString()
      };

      logger.info('Trip accepted by driver', acceptanceData);

      // Broadcast to rider and other drivers
      await broadcastTripAcceptance(io, acceptanceData);

      res.json({ 
        success: true, 
        message: 'Trip acceptance broadcasted successfully',
        trip_id,
        driver_id
      });

    } catch (error) {
      logger.error('Error broadcasting trip acceptance:', error);
      res.status(500).json({ error: 'Failed to broadcast trip acceptance' });
    }
  };
};

/**
 * 3. Handle responses to drivers when trip is no longer available
 */
const tripNoLongerAvailable = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        reason, // 'cancelled', 'accepted_by_another', 'expired'
        accepted_by_driver_id,
        cancelled_by,
        remaining_drivers
      } = req.body;

      // Validate required fields
      if (!trip_id || !reason) {
        return res.status(400).json({ 
          error: 'trip_id and reason are required' 
        });
      }

      const unavailableData = {
        trip_id,
        status: 'no_longer_available',
        reason,
        accepted_by_driver_id,
        cancelled_by,
        timestamp: new Date().toISOString()
      };

      logger.info('Trip no longer available', unavailableData);

      // Notify remaining drivers
      await broadcastTripUnavailable(io, unavailableData, remaining_drivers);

      res.json({ 
        success: true, 
        message: 'Trip unavailability broadcasted successfully',
        trip_id,
        reason,
        drivers_notified: remaining_drivers?.length || 0
      });

    } catch (error) {
      logger.error('Error broadcasting trip unavailability:', error);
      res.status(500).json({ error: 'Failed to broadcast trip unavailability' });
    }
  };
};

/**
 * 4. Handle driver arrival notification
 */
const driverArrived = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        driver_id, 
        rider_id,
        arrival_location,
        driver_location,
        arrival_time,
        wait_time_limit
      } = req.body;

      // Validate required fields
      if (!trip_id || !driver_id || !rider_id) {
        return res.status(400).json({ 
          error: 'trip_id, driver_id, and rider_id are required' 
        });
      }

      const arrivalData = {
        trip_id,
        driver_id,
        rider_id,
        status: 'driver_arrived',
        arrival_location,
        driver_location,
        arrival_time: arrival_time || new Date().toISOString(),
        wait_time_limit: wait_time_limit || 5, // 5 minutes default
        timestamp: new Date().toISOString()
      };

      logger.info('Driver arrived for pickup', arrivalData);

      // Broadcast to rider
      await broadcastDriverArrival(io, arrivalData);

      res.json({ 
        success: true, 
        message: 'Driver arrival broadcasted successfully',
        trip_id,
        driver_id
      });

    } catch (error) {
      logger.error('Error broadcasting driver arrival:', error);
      res.status(500).json({ error: 'Failed to broadcast driver arrival' });
    }
  };
};

/**
 * 5. Handle trip start notification
 */
const tripStarted = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        driver_id, 
        rider_id,
        start_location,
        destination,
        estimated_duration,
        estimated_fare
      } = req.body;

      // Validate required fields
      if (!trip_id || !driver_id || !rider_id) {
        return res.status(400).json({ 
          error: 'trip_id, driver_id, and rider_id are required' 
        });
      }

      const startData = {
        trip_id,
        driver_id,
        rider_id,
        status: 'trip_started',
        start_location,
        destination,
        estimated_duration,
        estimated_fare,
        start_time: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      logger.info('Trip started', startData);

      // Broadcast to both rider and driver
      await broadcastTripStart(io, startData);

      res.json({ 
        success: true, 
        message: 'Trip start broadcasted successfully',
        trip_id,
        start_time: startData.start_time
      });

    } catch (error) {
      logger.error('Error broadcasting trip start:', error);
      res.status(500).json({ error: 'Failed to broadcast trip start' });
    }
  };
};

/**
 * 6. Handle trip completion notification
 */
const tripCompleted = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        driver_id, 
        rider_id,
        end_location,
        trip_duration,
        trip_distance,
        final_fare,
        payment_method,
        rating_request
      } = req.body;

      // Validate required fields
      if (!trip_id || !driver_id || !rider_id) {
        return res.status(400).json({ 
          error: 'trip_id, driver_id, and rider_id are required' 
        });
      }

      const completionData = {
        trip_id,
        driver_id,
        rider_id,
        status: 'trip_completed',
        end_location,
        trip_duration,
        trip_distance,
        final_fare,
        payment_method,
        rating_request: rating_request !== false, // default to true
        completion_time: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      logger.info('Trip completed', completionData);

      // Broadcast to both rider and driver
      await broadcastTripCompletion(io, completionData);

      res.json({ 
        success: true, 
        message: 'Trip completion broadcasted successfully',
        trip_id,
        completion_time: completionData.completion_time
      });

    } catch (error) {
      logger.error('Error broadcasting trip completion:', error);
      res.status(500).json({ error: 'Failed to broadcast trip completion' });
    }
  };
};

/**
 * 7. Handle trip cancellation (by rider or driver)
 */
const tripCancelled = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        driver_id, 
        rider_id,
        cancelled_by, // 'rider', 'driver', 'system'
        cancellation_reason,
        cancellation_fee,
        refund_amount
      } = req.body;

      // Validate required fields
      if (!trip_id || !cancelled_by) {
        return res.status(400).json({ 
          error: 'trip_id and cancelled_by are required' 
        });
      }

      const cancellationData = {
        trip_id,
        driver_id,
        rider_id,
        status: 'trip_cancelled',
        cancelled_by,
        cancellation_reason,
        cancellation_fee,
        refund_amount,
        cancellation_time: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      logger.info('Trip cancelled', cancellationData);

      // Broadcast to relevant parties
      await broadcastTripCancellation(io, cancellationData);

      res.json({ 
        success: true, 
        message: 'Trip cancellation broadcasted successfully',
        trip_id,
        cancelled_by
      });

    } catch (error) {
      logger.error('Error broadcasting trip cancellation:', error);
      res.status(500).json({ error: 'Failed to broadcast trip cancellation' });
    }
  };
};

/**
 * 8. Handle driver location updates during trip
 */
const updateDriverLocation = (io) => {
  return async (req, res) => {
    try {
      const {
        driver_id,
        trip_id,
        location,
        heading,
        speed,
        estimated_arrival,
        distance_to_pickup,
        distance_to_destination
      } = req.body;

      // Validate required fields
      if (!driver_id || !location) {
        return res.status(400).json({ 
          error: 'driver_id and location are required' 
        });
      }

      const locationData = {
        driver_id,
        trip_id,
        location,
        heading,
        speed,
        estimated_arrival,
        distance_to_pickup,
        distance_to_destination,
        timestamp: new Date().toISOString()
      };

      logger.debug('Driver location update received', { driver_id, trip_id, location });

      // Broadcast to relevant users
      await broadcastDriverLocation(io, locationData);

      res.json({ 
        success: true, 
        message: 'Driver location updated successfully',
        driver_id 
      });

    } catch (error) {
      logger.error('Error updating driver location:', error);
      res.status(500).json({ error: 'Failed to update driver location' });
    }
  };
};

/**
 * 9. Handle payment processing updates
 */
const paymentUpdate = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        driver_id, 
        rider_id,
        payment_status, // 'processing', 'completed', 'failed', 'refunded'
        payment_method,
        amount,
        transaction_id,
        failure_reason
      } = req.body;

      // Validate required fields
      if (!trip_id || !payment_status) {
        return res.status(400).json({ 
          error: 'trip_id and payment_status are required' 
        });
      }

      const paymentData = {
        trip_id,
        driver_id,
        rider_id,
        payment_status,
        payment_method,
        amount,
        transaction_id,
        failure_reason,
        timestamp: new Date().toISOString()
      };

      logger.info('Payment update', paymentData);

      // Broadcast to relevant parties
      await broadcastPaymentUpdate(io, paymentData);

      res.json({ 
        success: true, 
        message: 'Payment update broadcasted successfully',
        trip_id,
        payment_status
      });

    } catch (error) {
      logger.error('Error broadcasting payment update:', error);
      res.status(500).json({ error: 'Failed to broadcast payment update' });
    }
  };
};

/**
 * 10. Handle emergency/SOS alerts
 */
const emergencyAlert = (io) => {
  return async (req, res) => {
    try {
      const { 
        trip_id, 
        driver_id, 
        rider_id,
        alert_type, // 'sos', 'panic', 'medical', 'accident'
        location,
        triggered_by, // 'rider', 'driver'
        emergency_contacts,
        additional_info
      } = req.body;

      // Validate required fields
      if (!trip_id || !alert_type || !triggered_by) {
        return res.status(400).json({ 
          error: 'trip_id, alert_type, and triggered_by are required' 
        });
      }

      const emergencyData = {
        trip_id,
        driver_id,
        rider_id,
        alert_type,
        location,
        triggered_by,
        emergency_contacts,
        additional_info,
        alert_time: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      logger.error('EMERGENCY ALERT', emergencyData);

      // Broadcast emergency alert
      await broadcastEmergencyAlert(io, emergencyData);

      res.json({ 
        success: true, 
        message: 'Emergency alert broadcasted successfully',
        trip_id,
        alert_type,
        alert_time: emergencyData.alert_time
      });

    } catch (error) {
      logger.error('Error broadcasting emergency alert:', error);
      res.status(500).json({ error: 'Failed to broadcast emergency alert' });
    }
  };
};

// Broadcasting functions

/**
 * Broadcast trip request to nearby drivers and rider
 */
async function broadcastTripToDrivers(io, requestData) {
  const { trip_id, rider_id, nearby_drivers } = requestData;

  // Broadcast to the rider
  const riderRoom = `user_${rider_id}`;
  io.to(riderRoom).emit('trip_sent_to_drivers', requestData);

  // Broadcast to nearby drivers
  if (nearby_drivers && nearby_drivers.length > 0) {
    nearby_drivers.forEach(driverId => {
      const driverRoom = `user_${driverId}`;
      io.to(driverRoom).emit('new_trip_request', requestData);
    });
  }

  // Also broadcast to general driver pool
  io.to('available_drivers').emit('new_trip_request', requestData);

  logger.info('Trip request broadcasted to drivers', { 
    trip_id, 
    rider_id, 
    nearby_drivers_count: nearby_drivers?.length || 0 
  });
}

/**
 * Broadcast trip acceptance to rider and other drivers
 */
async function broadcastTripAcceptance(io, acceptanceData) {
  const { trip_id, driver_id, rider_id } = acceptanceData;

  // Broadcast to the rider
  const riderRoom = `user_${rider_id}`;
  io.to(riderRoom).emit('trip_accepted', acceptanceData);

  // Broadcast to trip room
  const tripRoom = `trip_${trip_id}`;
  io.to(tripRoom).emit('trip_accepted', acceptanceData);

  logger.info('Trip acceptance broadcasted', { trip_id, driver_id, rider_id });
}

/**
 * Broadcast trip unavailability to remaining drivers
 */
async function broadcastTripUnavailable(io, unavailableData, remainingDrivers) {
  const { trip_id, reason } = unavailableData;

  // Broadcast to remaining drivers who were trying to accept
  if (remainingDrivers && remainingDrivers.length > 0) {
    remainingDrivers.forEach(driverId => {
      const driverRoom = `user_${driverId}`;
      io.to(driverRoom).emit('trip_no_longer_available', unavailableData);
    });
  }

  // Also broadcast to general driver pool
  io.to('available_drivers').emit('trip_no_longer_available', unavailableData);

  logger.info('Trip unavailability broadcasted', { 
    trip_id, 
    reason, 
    drivers_notified: remainingDrivers?.length || 0 
  });
}

/**
 * Broadcast driver arrival to rider
 */
async function broadcastDriverArrival(io, arrivalData) {
  const { trip_id, driver_id, rider_id } = arrivalData;

  // Broadcast to the rider
  const riderRoom = `user_${rider_id}`;
  io.to(riderRoom).emit('driver_arrived', arrivalData);

  // Broadcast to trip room
  const tripRoom = `trip_${trip_id}`;
  io.to(tripRoom).emit('driver_arrived', arrivalData);

  logger.info('Driver arrival broadcasted', { trip_id, driver_id, rider_id });
}

/**
 * Broadcast trip start to both parties
 */
async function broadcastTripStart(io, startData) {
  const { trip_id, driver_id, rider_id } = startData;

  // Broadcast to both rider and driver
  const riderRoom = `user_${rider_id}`;
  const driverRoom = `user_${driver_id}`;
  const tripRoom = `trip_${trip_id}`;

  io.to(riderRoom).emit('trip_started', startData);
  io.to(driverRoom).emit('trip_started', startData);
  io.to(tripRoom).emit('trip_started', startData);

  logger.info('Trip start broadcasted', { trip_id, driver_id, rider_id });
}

/**
 * Broadcast trip completion to both parties
 */
async function broadcastTripCompletion(io, completionData) {
  const { trip_id, driver_id, rider_id } = completionData;

  // Broadcast to both rider and driver
  const riderRoom = `user_${rider_id}`;
  const driverRoom = `user_${driver_id}`;
  const tripRoom = `trip_${trip_id}`;

  io.to(riderRoom).emit('trip_completed', completionData);
  io.to(driverRoom).emit('trip_completed', completionData);
  io.to(tripRoom).emit('trip_completed', completionData);

  logger.info('Trip completion broadcasted', { trip_id, driver_id, rider_id });
}

/**
 * Broadcast trip cancellation to relevant parties
 */
async function broadcastTripCancellation(io, cancellationData) {
  const { trip_id, driver_id, rider_id, cancelled_by } = cancellationData;

  // Broadcast to both parties if they exist
  if (rider_id) {
    const riderRoom = `user_${rider_id}`;
    io.to(riderRoom).emit('trip_cancelled', cancellationData);
  }
  
  if (driver_id) {
    const driverRoom = `user_${driver_id}`;
    io.to(driverRoom).emit('trip_cancelled', cancellationData);
  }

  // Broadcast to trip room
  const tripRoom = `trip_${trip_id}`;
  io.to(tripRoom).emit('trip_cancelled', cancellationData);

  logger.info('Trip cancellation broadcasted', { trip_id, driver_id, rider_id, cancelled_by });
}

/**
 * Broadcast driver location updates to relevant riders
 */
async function broadcastDriverLocation(io, locationData) {
  const { driver_id, trip_id } = locationData;

  // If driver is on a trip, broadcast to the rider
  if (trip_id) {
    const tripRoom = `trip_${trip_id}`;
    io.to(tripRoom).emit('driver_location_update', locationData);
  }

  // Broadcast to anyone specifically tracking this driver
  const driverTrackingRoom = `track_driver_${driver_id}`;
  io.to(driverTrackingRoom).emit('driver_location_update', locationData);

  logger.debug('Driver location broadcasted', { 
    driver_id, 
    trip_id,
    has_active_trip: !!trip_id 
  });
}

/**
 * Broadcast payment updates to relevant parties
 */
async function broadcastPaymentUpdate(io, paymentData) {
  const { trip_id, driver_id, rider_id, payment_status } = paymentData;

  // Broadcast to both parties
  if (rider_id) {
    const riderRoom = `user_${rider_id}`;
    io.to(riderRoom).emit('payment_update', paymentData);
  }
  
  if (driver_id) {
    const driverRoom = `user_${driver_id}`;
    io.to(driverRoom).emit('payment_update', paymentData);
  }

  // Broadcast to trip room
  const tripRoom = `trip_${trip_id}`;
  io.to(tripRoom).emit('payment_update', paymentData);

  logger.info('Payment update broadcasted', { trip_id, payment_status });
}

/**
 * Broadcast emergency alerts to all relevant parties and emergency services
 */
async function broadcastEmergencyAlert(io, emergencyData) {
  const { trip_id, driver_id, rider_id, alert_type, triggered_by } = emergencyData;

  // Broadcast to both parties
  if (rider_id) {
    const riderRoom = `user_${rider_id}`;
    io.to(riderRoom).emit('emergency_alert', emergencyData);
  }
  
  if (driver_id) {
    const driverRoom = `user_${driver_id}`;
    io.to(driverRoom).emit('emergency_alert', emergencyData);
  }

  // Broadcast to trip room
  const tripRoom = `trip_${trip_id}`;
  io.to(tripRoom).emit('emergency_alert', emergencyData);

  // Broadcast to emergency monitoring room (for admin/support)
  io.to('emergency_monitoring').emit('emergency_alert', emergencyData);

  logger.error('Emergency alert broadcasted', { trip_id, alert_type, triggered_by });
}

module.exports = {
  updateTripStatus,
  createTripRequest,
  legacyUpdateDriverLocation,
  sendTripToDrivers,
  tripAccepted,
  tripNoLongerAvailable,
  driverArrived,
  tripStarted,
  tripCompleted,
  tripCancelled,
  paymentUpdate,
  emergencyAlert
}; 