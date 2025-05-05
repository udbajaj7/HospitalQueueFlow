# Appointment vs. Walk-In Patient Logic

This document explains how the hospital queue management system handles appointment bookings and walk-in patients, including how doctor availability is managed and how tokens are allocated.

## Core Concepts

### Token Sources

Each patient token has a `source` field that determines how it was generated:

- **Walk-in (`TokenSourceEnum.WALKIN`)**: Patients who arrive without a prior appointment
- **Appointment (`TokenSourceEnum.APPOINTMENT`)**: Patients with scheduled appointments for specific times

### Doctor Availability

Doctors define when they're available to see patients:

- Each doctor specifies their regular hours for each day of the week
- Each doctor sets two important capacity parameters:
  - `appointmentSlotsPerHour`: Maximum number of appointments they can handle per hour
  - `walkInSlotsPerHour`: Maximum number of walk-in patients they can see per hour

### Appointment vs. Walk-in Allocation

The system intelligently manages both patient types:

- **For Appointments**: 
  - System checks if the doctor is available at the requested appointment time
  - System checks if there are available appointment slots for that hour
  - Appointment tokens include a future `appointmentTime` field
  - Patients only get checked in (`checkInAt`) when they actually arrive

- **For Walk-ins**:
  - System checks if the doctor is available at the current time
  - System checks if there are available walk-in slots for the current hour
  - If a doctor has fewer booked appointments than their maximum capacity, extra slots can be allocated to walk-ins
  - Walk-in patients are immediately checked in (their `checkInAt` time equals their `issuedAt` time)

## Implementation Details

### Doctor Slot Calculation (DoctorSlot)

For each hour, the system calculates the following for a doctor:

```typescript
type DoctorSlot = {
  bookedAppointments: number;        // How many appointment slots are already taken
  walkInsIssued: number;             // How many walk-in patients have been issued tokens
  appointmentSlotsPerHour: number;   // Maximum appointments per hour
  walkInSlotsPerHour: number;        // Maximum walk-ins per hour
  isAvailable: boolean;              // Whether the doctor is available this hour
  remainingWalkInSlots: number;      // How many more walk-ins can be accommodated
};
```

### Flexible Capacity Management

The `remainingWalkInSlots` is calculated using this formula:

```typescript
// If appointments are less than max, allow overflow to walk-ins
const maxWalkInSlots = bookedCount < doctor.appointmentSlotsPerHour 
  ? doctor.walkInSlotsPerHour + (doctor.appointmentSlotsPerHour - bookedCount)
  : doctor.walkInSlotsPerHour;
      
const remainingWalkInSlots = Math.max(0, maxWalkInSlots - walkInCount);
```

This logic allows doctors to see more walk-in patients if they have fewer appointments than their maximum capacity, optimizing resource utilization.

## API Endpoints

The system provides several REST API endpoints to manage this functionality:

- GET `/api/doctors/:id/availabilities`: Get a doctor's availability schedule
- POST `/api/doctors/:id/availabilities`: Add availability for a doctor
- PUT `/api/doctors/availabilities/:id`: Update an availability slot
- DELETE `/api/doctors/availabilities/:id`: Remove an availability slot
- GET `/api/doctors/:id/slots`: Check a doctor's slot availability for a specific hour

## Token Creation Logic Flow

When creating a new token, the system follows this logic:

1. Determine if token is for an appointment or walk-in (`source` field)
2. If it's an OPD department with assigned doctor:
   - For walk-ins:
     - Check if doctor is available at current hour
     - Check if there are remaining walk-in slots
     - Set `checkInAt` to current time
   - For appointments:
     - Check if doctor is available at requested appointment time
     - Check if there are available appointment slots
     - Leave `checkInAt` empty (will be set when patient arrives)
3. Generate token number and other metadata
4. Return token with estimated wait time

## Testing the System

You can test the appointment vs. walk-in logic using these API calls:

### Check Doctor Availability

```
GET /api/doctors/dr-smith/availabilities
```

### Check Slot Availability

```
GET /api/doctors/dr-smith/slots?date=2025-05-05&hour=10
```

### Create a Walk-in Token

```
POST /api/tokens
{
  "departmentCode": "opd-demo",
  "patientId": "patient-1",
  "priority": "normal",
  "doctorId": "dr-smith",
  "source": "walk-in"
}
```

### Create an Appointment Token

```
POST /api/tokens
{
  "departmentCode": "opd-demo",
  "patientId": "patient-2",
  "priority": "normal", 
  "doctorId": "dr-jones",
  "source": "appointment",
  "appointmentTime": "2025-05-06T10:00:00Z"
}
```

## Demo Data

The system includes demo data with:

- 2 doctors: Dr. Smith and Dr. Jones, each with different availability schedules and slot capacities
- 2 patients: John Smith and Jane Doe
- Sample availabilities for both doctors, including today's date
- You can run the setup script to populate this data: `node setup-demo.js`