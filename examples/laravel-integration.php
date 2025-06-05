<?php

/**
 * Laravel Service Class for Allez Middleman Integration
 * 
 * This service handles communication between your Laravel backend
 * and the Allez Middleman real-time server.
 */

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AllezMiddlemanService
{
    private $baseUrl;
    private $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('allez.middleman_url', 'http://localhost:3001');
        $this->apiKey = config('allez.middleman_api_key');
    }

    /**
     * 1. Send trip to nearby drivers
     */
    public function sendTripToDrivers($tripId, $riderId, $pickupLocation, $nearbyDrivers, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'rider_id' => $riderId,
                'pickup_location' => $pickupLocation,
                'nearby_drivers' => $nearbyDrivers,
                'expires_at' => now()->addMinutes(2)->toISOString(),
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/trip/send-to-drivers', $payload);

            if ($response->successful()) {
                Log::info('Trip sent to drivers successfully', [
                    'trip_id' => $tripId,
                    'drivers_count' => count($nearbyDrivers),
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to send trip to drivers', [
                    'trip_id' => $tripId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while sending trip to drivers', [
                'trip_id' => $tripId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 2. Notify trip acceptance
     */
    public function notifyTripAccepted($tripId, $driverId, $riderId, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'driver_id' => $driverId,
                'rider_id' => $riderId,
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/trip/accepted', $payload);

            if ($response->successful()) {
                Log::info('Trip acceptance notified successfully', [
                    'trip_id' => $tripId,
                    'driver_id' => $driverId,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to notify trip acceptance', [
                    'trip_id' => $tripId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while notifying trip acceptance', [
                'trip_id' => $tripId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 3. Notify trip no longer available
     */
    public function notifyTripNoLongerAvailable($tripId, $reason, $remainingDrivers = [], $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'reason' => $reason, // 'cancelled', 'accepted_by_another', 'expired'
                'remaining_drivers' => $remainingDrivers,
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/trip/no-longer-available', $payload);

            if ($response->successful()) {
                Log::info('Trip unavailability notified successfully', [
                    'trip_id' => $tripId,
                    'reason' => $reason,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to notify trip unavailability', [
                    'trip_id' => $tripId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while notifying trip unavailability', [
                'trip_id' => $tripId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 4. Notify driver arrival
     */
    public function notifyDriverArrived($tripId, $driverId, $riderId, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'driver_id' => $driverId,
                'rider_id' => $riderId,
                'arrival_time' => now()->toISOString(),
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/trip/driver-arrived', $payload);

            if ($response->successful()) {
                Log::info('Driver arrival notified successfully', [
                    'trip_id' => $tripId,
                    'driver_id' => $driverId,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to notify driver arrival', [
                    'trip_id' => $tripId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while notifying driver arrival', [
                'trip_id' => $tripId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 5. Notify trip started
     */
    public function notifyTripStarted($tripId, $driverId, $riderId, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'driver_id' => $driverId,
                'rider_id' => $riderId,
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/trip/started', $payload);

            if ($response->successful()) {
                Log::info('Trip start notified successfully', [
                    'trip_id' => $tripId,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to notify trip start', [
                    'trip_id' => $tripId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while notifying trip start', [
                'trip_id' => $tripId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 6. Notify trip completed
     */
    public function notifyTripCompleted($tripId, $driverId, $riderId, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'driver_id' => $driverId,
                'rider_id' => $riderId,
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/trip/completed', $payload);

            if ($response->successful()) {
                Log::info('Trip completion notified successfully', [
                    'trip_id' => $tripId,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to notify trip completion', [
                    'trip_id' => $tripId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while notifying trip completion', [
                'trip_id' => $tripId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 7. Notify trip cancelled
     */
    public function notifyTripCancelled($tripId, $cancelledBy, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'cancelled_by' => $cancelledBy, // 'rider', 'driver', 'system'
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/trip/cancelled', $payload);

            if ($response->successful()) {
                Log::info('Trip cancellation notified successfully', [
                    'trip_id' => $tripId,
                    'cancelled_by' => $cancelledBy,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to notify trip cancellation', [
                    'trip_id' => $tripId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while notifying trip cancellation', [
                'trip_id' => $tripId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 8. Update driver location during trip
     */
    public function updateDriverLocationDuringTrip($driverId, $location, $tripId = null, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'driver_id' => $driverId,
                'trip_id' => $tripId,
                'location' => $location,
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/driver/location-update', $payload);

            if ($response->successful()) {
                Log::debug('Driver location updated successfully', [
                    'driver_id' => $driverId,
                    'trip_id' => $tripId
                ]);
                return $response->json();
            } else {
                Log::error('Failed to update driver location', [
                    'driver_id' => $driverId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while updating driver location', [
                'driver_id' => $driverId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 9. Send payment update
     */
    public function sendPaymentUpdate($tripId, $paymentStatus, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'payment_status' => $paymentStatus, // 'processing', 'completed', 'failed', 'refunded'
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/payment/update', $payload);

            if ($response->successful()) {
                Log::info('Payment update sent successfully', [
                    'trip_id' => $tripId,
                    'payment_status' => $paymentStatus,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to send payment update', [
                    'trip_id' => $tripId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while sending payment update', [
                'trip_id' => $tripId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 10. Send emergency alert
     */
    public function sendEmergencyAlert($tripId, $alertType, $triggeredBy, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'alert_type' => $alertType, // 'sos', 'panic', 'medical', 'accident'
                'triggered_by' => $triggeredBy, // 'rider', 'driver'
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/emergency/alert', $payload);

            if ($response->successful()) {
                Log::error('Emergency alert sent successfully', [
                    'trip_id' => $tripId,
                    'alert_type' => $alertType,
                    'triggered_by' => $triggeredBy,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to send emergency alert', [
                    'trip_id' => $tripId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while sending emergency alert', [
                'trip_id' => $tripId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    // === LEGACY METHODS (for backward compatibility) ===

    /**
     * Send trip status update to middleman server
     */
    public function updateTripStatus($tripId, $status, $driverId = null, $riderId = null, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'status' => $status,
                'driver_id' => $driverId,
                'rider_id' => $riderId,
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/trip/update', $payload);

            if ($response->successful()) {
                Log::info('Trip status updated successfully', [
                    'trip_id' => $tripId,
                    'status' => $status,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to update trip status', [
                    'trip_id' => $tripId,
                    'status' => $status,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while updating trip status', [
                'trip_id' => $tripId,
                'status' => $status,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send new trip request to middleman server
     */
    public function createTripRequest($tripId, $riderId, $pickupLocation, $destination = null, $nearbyDrivers = [], $additionalData = [])
    {
        try {
            $payload = array_merge([
                'trip_id' => $tripId,
                'rider_id' => $riderId,
                'pickup_location' => $pickupLocation,
                'destination' => $destination,
                'nearby_drivers' => $nearbyDrivers,
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/trip/request', $payload);

            if ($response->successful()) {
                Log::info('Trip request created successfully', [
                    'trip_id' => $tripId,
                    'rider_id' => $riderId,
                    'response' => $response->json()
                ]);
                return $response->json();
            } else {
                Log::error('Failed to create trip request', [
                    'trip_id' => $tripId,
                    'rider_id' => $riderId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while creating trip request', [
                'trip_id' => $tripId,
                'rider_id' => $riderId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Send driver location update to middleman server
     */
    public function updateDriverLocation($driverId, $location, $isAvailable = true, $currentTripId = null, $additionalData = [])
    {
        try {
            $payload = array_merge([
                'driver_id' => $driverId,
                'location' => $location,
                'is_available' => $isAvailable,
                'current_trip_id' => $currentTripId,
                'timestamp' => now()->toISOString(),
            ], $additionalData);

            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/api/driver/location', $payload);

            if ($response->successful()) {
                Log::debug('Driver location updated successfully', [
                    'driver_id' => $driverId,
                    'location' => $location
                ]);
                return $response->json();
            } else {
                Log::error('Failed to update driver location', [
                    'driver_id' => $driverId,
                    'response_code' => $response->status(),
                    'response_body' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception while updating driver location', [
                'driver_id' => $driverId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}

/**
 * Example usage in your Laravel controllers/jobs:
 */

// In your TripController or wherever you handle trip lifecycle events
class TripController extends Controller
{
    private $middlemanService;

    public function __construct(AllezMiddlemanService $middlemanService)
    {
        $this->middlemanService = $middlemanService;
    }

    /**
     * Create a new trip and send to nearby drivers
     */
    public function createTrip(Request $request)
    {
        // Your existing trip creation logic
        $trip = Trip::create([
            'rider_id' => $request->rider_id,
            'pickup_location' => $request->pickup_location,
            'destination' => $request->destination,
            'status' => 'searching_for_driver'
        ]);

        // Find nearby drivers
        $nearbyDrivers = $this->findNearbyDrivers($request->pickup_location);

        // Send to middleman for real-time broadcasting
        $this->middlemanService->sendTripToDrivers(
            $trip->id,
            $trip->rider_id,
            $trip->pickup_location,
            $nearbyDrivers->pluck('id')->toArray(),
            [
                'destination' => $trip->destination,
                'fare_estimate' => $this->calculateFareEstimate($trip),
                'trip_type' => $request->trip_type ?? 'standard'
            ]
        );

        return response()->json(['success' => true, 'trip' => $trip]);
    }

    /**
     * Driver accepts a trip
     */
    public function acceptTrip(Request $request, $tripId)
    {
        $trip = Trip::findOrFail($tripId);
        
        // Check if trip is still available
        if ($trip->status !== 'searching_for_driver') {
            return response()->json(['error' => 'Trip no longer available'], 409);
        }

        // Update trip status
        $trip->update([
            'status' => 'accepted',
            'driver_id' => $request->driver_id,
            'accepted_at' => now()
        ]);

        // Notify via middleman
        $this->middlemanService->notifyTripAccepted(
            $tripId,
            $request->driver_id,
            $trip->rider_id,
            [
                'estimated_arrival' => $request->estimated_arrival,
                'driver_location' => $request->driver_location,
                'driver_info' => $this->getDriverInfo($request->driver_id)
            ]
        );

        // Notify other drivers that trip is no longer available
        $otherDrivers = $this->getOtherInterestedDrivers($tripId, $request->driver_id);
        $this->middlemanService->notifyTripNoLongerAvailable(
            $tripId,
            'accepted_by_another',
            $otherDrivers,
            ['accepted_by_driver_id' => $request->driver_id]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Driver arrives for pickup
     */
    public function driverArrived($tripId)
    {
        $trip = Trip::findOrFail($tripId);
        $trip->update(['status' => 'driver_arrived', 'arrived_at' => now()]);

        $this->middlemanService->notifyDriverArrived(
            $tripId,
            $trip->driver_id,
            $trip->rider_id,
            [
                'arrival_location' => $trip->pickup_location,
                'wait_time_limit' => 5 // 5 minutes
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Start the trip
     */
    public function startTrip($tripId)
    {
        $trip = Trip::findOrFail($tripId);
        $trip->update(['status' => 'in_progress', 'started_at' => now()]);

        $this->middlemanService->notifyTripStarted(
            $tripId,
            $trip->driver_id,
            $trip->rider_id,
            [
                'start_location' => $trip->pickup_location,
                'destination' => $trip->destination,
                'estimated_duration' => $this->calculateEstimatedDuration($trip)
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Complete the trip
     */
    public function completeTrip($tripId)
    {
        $trip = Trip::findOrFail($tripId);
        $trip->update(['status' => 'completed', 'completed_at' => now()]);

        $this->middlemanService->notifyTripCompleted(
            $tripId,
            $trip->driver_id,
            $trip->rider_id,
            [
                'end_location' => $trip->destination,
                'trip_duration' => $trip->completed_at->diffInMinutes($trip->started_at),
                'final_fare' => $trip->final_fare,
                'payment_method' => $trip->payment_method
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Cancel the trip
     */
    public function cancelTrip(Request $request, $tripId)
    {
        $trip = Trip::findOrFail($tripId);
        $trip->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancelled_by' => $request->cancelled_by,
            'cancellation_reason' => $request->reason
        ]);

        $this->middlemanService->notifyTripCancelled(
            $tripId,
            $request->cancelled_by,
            [
                'driver_id' => $trip->driver_id,
                'rider_id' => $trip->rider_id,
                'cancellation_reason' => $request->reason,
                'cancellation_fee' => $this->calculateCancellationFee($trip)
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Update driver location during trip
     */
    public function updateDriverLocation(Request $request)
    {
        $this->middlemanService->updateDriverLocationDuringTrip(
            $request->driver_id,
            $request->location,
            $request->trip_id,
            [
                'heading' => $request->heading,
                'speed' => $request->speed,
                'estimated_arrival' => $request->estimated_arrival
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Handle emergency alert
     */
    public function emergencyAlert(Request $request)
    {
        $this->middlemanService->sendEmergencyAlert(
            $request->trip_id,
            $request->alert_type,
            $request->triggered_by,
            [
                'driver_id' => $request->driver_id,
                'rider_id' => $request->rider_id,
                'location' => $request->location,
                'emergency_contacts' => $request->emergency_contacts
            ]
        );

        // Also handle emergency in your system (notify authorities, etc.)
        $this->handleEmergencyInSystem($request);

        return response()->json(['success' => true]);
    }
}

/**
 * Add this to your config/allez.php configuration file:
 */
/*
return [
    'middleman_url' => env('ALLEZ_MIDDLEMAN_URL', 'http://localhost:3001'),
    'middleman_api_key' => env('ALLEZ_MIDDLEMAN_API_KEY'),
];
*/

/**
 * Add these to your .env file:
 */
/*
ALLEZ_MIDDLEMAN_URL=http://localhost:3001
ALLEZ_MIDDLEMAN_API_KEY=your-laravel-api-key-for-authentication
*/ 