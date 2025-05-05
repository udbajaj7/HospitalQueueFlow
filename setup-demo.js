// This is a more direct approach to add demo data to our database
import { db } from './server/db.ts';
import { 
  departments, 
  doctors,
  availabilities,
  patients
} from './shared/schema.ts';
import { v4 as uuidv4 } from 'uuid';

async function setupDemoData() {
  try {
    console.log("Setting up department...");
    await db.insert(departments).values({
      code: 'opd-demo',
      name: 'OPD Demonstration',
      category: 'opd_consultation',
      avgServiceTime: '15',
      active: true
    }).onConflictDoUpdate({
      target: departments.code,
      set: { 
        name: 'OPD Demonstration', 
        category: 'opd_consultation',
        avgServiceTime: '15',
        active: true
      }
    });
    
    console.log("Setting up doctors...");
    await db.insert(doctors).values({
      id: 'dr-smith',
      name: 'Dr. Smith',
      departmentCode: 'opd-demo',
      specialization: 'General Medicine',
      appointmentSlotsPerHour: 3,
      walkInSlotsPerHour: 2,
      active: true
    }).onConflictDoUpdate({
      target: doctors.id,
      set: { 
        name: 'Dr. Smith',
        departmentCode: 'opd-demo',
        specialization: 'General Medicine',
        appointmentSlotsPerHour: 3,
        walkInSlotsPerHour: 2,
        active: true
      }
    });
    
    await db.insert(doctors).values({
      id: 'dr-jones',
      name: 'Dr. Jones',
      departmentCode: 'opd-demo',
      specialization: 'Cardiology',
      appointmentSlotsPerHour: 4,
      walkInSlotsPerHour: 1,
      active: true
    }).onConflictDoUpdate({
      target: doctors.id,
      set: { 
        name: 'Dr. Jones',
        departmentCode: 'opd-demo',
        specialization: 'Cardiology',
        appointmentSlotsPerHour: 4,
        walkInSlotsPerHour: 1,
        active: true
      }
    });
    
    console.log("Adding today's availability for both doctors...");
    // Get today's day of week (0-6, where 0 = Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Add availability for Dr. Smith today
    await db.insert(availabilities).values({
      doctorId: 'dr-smith',
      dayOfWeek,
      startHour: 9,
      endHour: 17
    }).onConflictDoNothing();
    
    // Add availability for Dr. Jones today
    await db.insert(availabilities).values({
      doctorId: 'dr-jones',
      dayOfWeek,
      startHour: 9,
      endHour: 17
    }).onConflictDoNothing();
    
    console.log("Creating some test patients...");
    await db.insert(patients).values({
      id: 'patient-1',
      name: 'John Smith',
      mrn: 'MRN001',
      mobile: '+1234567890',
      email: 'john@example.com',
      dateOfBirth: new Date('1980-05-15'),
      gender: 'male'
    }).onConflictDoUpdate({
      target: patients.id,
      set: {
        name: 'John Smith',
        mrn: 'MRN001',
        mobile: '+1234567890',
        email: 'john@example.com'
      }
    });
    
    await db.insert(patients).values({
      id: 'patient-2',
      name: 'Jane Doe',
      mrn: 'MRN002',
      mobile: '+0987654321',
      email: 'jane@example.com',
      dateOfBirth: new Date('1975-10-20'),
      gender: 'female'
    }).onConflictDoUpdate({
      target: patients.id,
      set: {
        name: 'Jane Doe',
        mrn: 'MRN002',
        mobile: '+0987654321',
        email: 'jane@example.com'
      }
    });
    
    console.log("Demo data setup completed successfully!");
  } catch (error) {
    console.error("Error setting up demo data:", error);
    throw error;
  }
}

// Run the setup
setupDemoData()
  .then(() => {
    console.log("Demo setup completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("Setup failed:", error);
    process.exit(1);
  });