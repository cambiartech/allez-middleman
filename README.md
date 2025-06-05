# Allez Middleman - Real-Time Server

A dedicated real-time middleman server for ride-hailing applications that eliminates dependency on unreliable push notifications by maintaining persistent WebSocket connections with clients and providing instant delivery of trip status updates.

## 🚀 Features

- **Real-time WebSocket Communication** using Socket.IO
- **10 Complete Trip Lifecycle Endpoints** for comprehensive trip management
- **Secure Authentication** (JWT for clients, API keys for backend)
- **Room-based Broadcasting** for targeted message delivery
- **Driver Location Tracking** with real-time updates
- **Emergency Alert System** with SOS functionality
- **Rate Limiting & CORS Protection**
- **Comprehensive Logging** with Winston
- **Scalable Architecture** ready for Redis clustering
- **Production-ready** with health checks and graceful shutdown

## 🛠 Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - HTTP server framework
- **Socket.IO** - Real-time WebSocket communication
- **JWT** - Authentication tokens
- **Redis** (optional) - For scaling across multiple instances
- **Winston** - Structured logging

## 📋 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd allez-middleman

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start the server
npm start

# For development with auto-reload
npm run dev
```

### Environment Configuration

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Redis Configuration (optional, for scaling)
REDIS_URL=redis://localhost:6379

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Backend Authentication
LARAVEL_API_KEY=your-laravel-api-key-for-authentication

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## 🔗 API Endpoints

### Trip Lifecycle Endpoints

#### 1. Send Trip to Drivers
```http
POST /api/trip/send-to-drivers
```
**Purpose**: Broadcast trip requests to nearby drivers when a trip is created.

**Payload**:
```json
{
  "trip_id": "trip_123",
  "rider_id": "rider_456",
  "pickup_location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "address": "123 Main St, New York, NY"
  },
  "destination": {
    "lat": 40.7589,
    "lng": -73.9851,
    "address": "456 Broadway, New York, NY"
  },
  "nearby_drivers": ["driver_1", "driver_2", "driver_3"],
  "fare_estimate": 15.50,
  "trip_type": "standard",
  "expires_at": "2024-01-15T10:32:00Z"
}
```

#### 2. Trip Accepted by Driver
```http
POST /api/trip/accepted
```
**Purpose**: Notify rider when a driver accepts their trip request.

**Payload**:
```json
{
  "trip_id": "trip_123",
  "driver_id": "driver_1",
  "rider_id": "rider_456",
  "estimated_arrival": "2024-01-15T10:15:00Z",
  "driver_location": {
    "lat": 40.7200,
    "lng": -74.0100
  },
  "driver_info": {
    "name": "John Doe",
    "rating": 4.8,
    "vehicle": "Toyota Camry - ABC123"
  }
}
```

#### 3. Trip No Longer Available
```http
POST /api/trip/no-longer-available
```
**Purpose**: Notify remaining drivers when a trip is no longer available.

**Payload**:
```json
{
  "trip_id": "trip_123",
  "reason": "accepted_by_another",
  "accepted_by_driver_id": "driver_1",
  "remaining_drivers": ["driver_2", "driver_3"]
}
```

#### 4. Driver Arrived for Pickup
```http
POST /api/trip/driver-arrived
```
**Purpose**: Notify rider when driver arrives at pickup location.

**Payload**:
```json
{
  "trip_id": "trip_123",
  "driver_id": "driver_1",
  "rider_id": "rider_456",
  "arrival_location": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "wait_time_limit": 5
}
```

#### 5. Trip Started
```http
POST /api/trip/started
```
**Purpose**: Notify both parties when the trip begins.

**Payload**:
```json
{
  "trip_id": "trip_123",
  "driver_id": "driver_1",
  "rider_id": "rider_456",
  "start_location": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "estimated_duration": 25,
  "estimated_fare": 15.50
}
```

#### 6. Trip Completed
```http
POST /api/trip/completed
```
**Purpose**: Notify both parties when trip is completed and request ratings.

**Payload**:
```json
{
  "trip_id": "trip_123",
  "driver_id": "driver_1",
  "rider_id": "rider_456",
  "end_location": {
    "lat": 40.7589,
    "lng": -73.9851
  },
  "trip_duration": 23,
  "trip_distance": 5.2,
  "final_fare": 16.25,
  "payment_method": "credit_card"
}
```

#### 7. Trip Cancelled
```http
POST /api/trip/cancelled
```
**Purpose**: Handle trip cancellations by any party.

**Payload**:
```json
{
  "trip_id": "trip_123",
  "driver_id": "driver_1",
  "rider_id": "rider_456",
  "cancelled_by": "rider",
  "cancellation_reason": "Change of plans",
  "cancellation_fee": 2.50
}
```

#### 8. Driver Location Updates
```http
POST /api/driver/location-update
```
**Purpose**: Real-time location updates during trips.

**Payload**:
```json
{
  "driver_id": "driver_1",
  "trip_id": "trip_123",
  "location": {
    "lat": 40.7300,
    "lng": -74.0200
  },
  "heading": 45,
  "speed": 25,
  "estimated_arrival": "2024-01-15T10:15:00Z"
}
```

#### 9. Payment Processing Updates
```http
POST /api/payment/update
```
**Purpose**: Notify parties about payment status changes.

**Payload**:
```json
{
  "trip_id": "trip_123",
  "driver_id": "driver_1",
  "rider_id": "rider_456",
  "payment_status": "completed",
  "payment_method": "credit_card",
  "amount": 16.25,
  "transaction_id": "txn_abc123"
}
```

#### 10. Emergency/SOS Alerts
```http
POST /api/emergency/alert
```
**Purpose**: Handle emergency situations and SOS alerts.

**Payload**:
```json
{
  "trip_id": "trip_123",
  "driver_id": "driver_1",
  "rider_id": "rider_456",
  "alert_type": "sos",
  "triggered_by": "rider",
  "location": {
    "lat": 40.7400,
    "lng": -74.0300
  },
  "emergency_contacts": ["911", "+1234567890"]
}
```

### Legacy Endpoints (Backward Compatibility)

#### Trip Status Update
```http
POST /api/trip/update
```

#### Trip Request
```http
POST /api/trip/request
```

#### Driver Location (Legacy)
```http
POST /api/driver/location
```

### Utility Endpoints

#### Health Check
```http
GET /health
```
Returns server status, uptime, and connection count.

## 🔌 WebSocket Events

### Client-to-Server Events

- `join_user_room` - Join user-specific room for notifications
- `subscribe_to_trip` - Subscribe to specific trip updates
- `unsubscribe_from_trip` - Unsubscribe from trip updates
- `driver_toggle_availability` - Toggle driver availability status
- `driver_location_update` - Send driver location update
- `accept_trip` - Driver accepts a trip request
- `reject_trip` - Driver rejects a trip request
- `ping` - Heartbeat to maintain connection

### Server-to-Client Events

- `trip_sent_to_drivers` - Trip request sent to drivers
- `new_trip_request` - New trip available for driver
- `trip_accepted` - Trip accepted by driver
- `trip_no_longer_available` - Trip no longer available
- `driver_arrived` - Driver arrived for pickup
- `trip_started` - Trip has started
- `trip_completed` - Trip completed
- `trip_cancelled` - Trip cancelled
- `driver_location_update` - Real-time driver location
- `payment_update` - Payment status update
- `emergency_alert` - Emergency/SOS alert
- `pong` - Heartbeat response

## 🔐 Authentication & Security

### Backend Authentication
Laravel backend requests use API key authentication:
```http
X-API-Key: your-laravel-api-key
```

### WebSocket Authentication
Clients authenticate using JWT tokens:
```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Security Features
- Rate limiting on API endpoints
- CORS protection
- Helmet security headers
- Input validation and sanitization
- Structured error handling and logging

## 🔧 Laravel Integration

### Service Class Setup

1. **Install the service class**:
```bash
# Copy the service class to your Laravel app
cp examples/laravel-integration.php app/Services/AllezMiddlemanService.php
```

2. **Add configuration**:
```php
// config/allez.php
return [
    'middleman_url' => env('ALLEZ_MIDDLEMAN_URL', 'http://localhost:3001'),
    'middleman_api_key' => env('ALLEZ_MIDDLEMAN_API_KEY'),
];
```

3. **Environment variables**:
```env
ALLEZ_MIDDLEMAN_URL=http://localhost:3001
ALLEZ_MIDDLEMAN_API_KEY=your-laravel-api-key
```

### Usage Examples

```php
// In your controller
public function createTrip(Request $request)
{
    $trip = Trip::create($request->validated());
    $nearbyDrivers = $this->findNearbyDrivers($request->pickup_location);
    
    // Send to middleman for real-time broadcasting
    app(AllezMiddlemanService::class)->sendTripToDrivers(
        $trip->id,
        $trip->rider_id,
        $trip->pickup_location,
        $nearbyDrivers->pluck('id')->toArray(),
        [
            'destination' => $trip->destination,
            'fare_estimate' => $this->calculateFareEstimate($trip)
        ]
    );
    
    return response()->json(['success' => true, 'trip' => $trip]);
}
```

## 🌐 Frontend Integration

### JavaScript Client

```javascript
// Initialize connection
const client = new AllezRealtimeClient('http://localhost:3001', {
  token: 'your-jwt-token',
  userId: 'user_123',
  userType: 'rider' // or 'driver'
});

// Connect and handle events
await client.connect();

// Subscribe to trip updates
client.subscribeToTrip('trip_123');

// Listen for events
client.on('trip_accepted', (data) => {
  console.log('Trip accepted by driver:', data);
  // Update UI with driver info
});

client.on('driver_location_update', (data) => {
  console.log('Driver location:', data.location);
  // Update map with driver position
});
```

### React Integration

```jsx
import { useEffect, useState } from 'react';
import { AllezRealtimeClient } from './allez-realtime-client';

function TripTracker({ tripId, userToken }) {
  const [client, setClient] = useState(null);
  const [tripStatus, setTripStatus] = useState(null);

  useEffect(() => {
    const realtimeClient = new AllezRealtimeClient('http://localhost:3001', {
      token: userToken,
      userId: 'user_123',
      userType: 'rider'
    });

    realtimeClient.connect().then(() => {
      realtimeClient.subscribeToTrip(tripId);
      setClient(realtimeClient);
    });

    // Event listeners
    realtimeClient.on('trip_accepted', (data) => {
      setTripStatus('accepted');
    });

    realtimeClient.on('driver_arrived', (data) => {
      setTripStatus('driver_arrived');
    });

    return () => {
      realtimeClient.disconnect();
    };
  }, [tripId, userToken]);

  return (
    <div>
      <h3>Trip Status: {tripStatus}</h3>
      {/* Your trip tracking UI */}
    </div>
  );
}
```

## 🚀 Hosting & Deployment

### Recommended Hosting Platforms

1. **Railway** ($5/month) - ⭐ **Recommended**
   - Excellent WebSocket support
   - Auto-scaling
   - Easy deployment from Git
   - Built-in Redis support

2. **Render** ($7/month)
   - Native WebSocket support
   - Automatic SSL certificates
   - Zero-downtime deployments

3. **Fly.io** (~$5/month)
   - Global edge deployment
   - Low-latency worldwide
   - Docker-based deployment

4. **DigitalOcean App Platform** ($5/month)
   - Reliable and stable
   - Easy scaling options
   - Managed databases

5. **Heroku** ($5/month)
   - Proven platform
   - Excellent Socket.IO support
   - Large ecosystem

### Deployment Steps (Railway Example)

1. **Connect your repository**:
   ```bash
   # Push your code to GitHub
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Railway**:
   - Visit [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Set environment variables
   - Deploy automatically

3. **Configure environment variables**:
   ```env
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=your-production-jwt-secret
   LARAVEL_API_KEY=your-production-api-key
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

### Production Considerations

- **SSL/TLS**: Ensure HTTPS for WebSocket connections
- **Environment Variables**: Use secure secrets in production
- **Monitoring**: Set up health checks and alerting
- **Scaling**: Configure Redis for multi-instance deployments
- **Logging**: Use structured logging with log aggregation
- **Rate Limiting**: Adjust limits based on expected traffic

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```http
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "connections": 150
}
```

### Logging
The server uses Winston for structured logging:
- **Error logs**: Critical issues and exceptions
- **Info logs**: Trip events and important operations
- **Debug logs**: Detailed operation information
- **Access logs**: HTTP request logging

### Metrics to Monitor
- Active WebSocket connections
- API response times
- Error rates
- Memory and CPU usage
- Trip event throughput

## 🔧 Development

### Running Tests
```bash
# Run test suite
npm test

# Run with coverage
npm run test:coverage
```

### Development Mode
```bash
# Start with auto-reload
npm run dev

# Start with debugging
npm run debug
```

### Testing WebSocket Connections
Use the included test client:
```bash
# Open test/test-client.html in your browser
# Or serve it locally:
npx http-server test/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the logs for error details
- Verify environment configuration
- Test WebSocket connectivity
- Review Laravel integration setup

## 📚 Trip Status Flow

```
1. Trip Created → Send to Drivers
2. Driver Accepts → Notify Rider + Other Drivers (No Longer Available)
3. Driver Arrives → Notify Rider
4. Trip Starts → Notify Both Parties
5. Location Updates → Real-time Tracking
6. Trip Completes → Payment + Rating Request
7. Payment Processed → Final Confirmation

Alternative flows:
- Trip Cancelled (any stage) → Notify All Parties
- Emergency Alert → Broadcast to All + Authorities
```

This real-time middleman server ensures instant delivery of all trip status updates, eliminating the unreliability of push notifications and providing a seamless ride-hailing experience. 