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
    // Create Dr. Smith with UUID
    const drSmithId = uuidv4();
    await db.insert(doctors).values({
      id: drSmithId,
      name: 'Dr. Smith',
      departmentCode: 'opd-demo',
      appointmentSlotsPerHour: 3,
      walkInSlotsPerHour: 2,
      active: true
    });
    console.log(`Created Dr. Smith with ID: ${drSmithId}`);
    
    // Create Dr. Jones with UUID
    const drJonesId = uuidv4();
    await db.insert(doctors).values({
      id: drJonesId,
      name: 'Dr. Jones',
      departmentCode: 'opd-demo',
      appointmentSlotsPerHour: 4,
      walkInSlotsPerHour: 1,
      active: true
    });
    console.log(`Created Dr. Jones with ID: ${drJonesId}`);
    
    console.log("Adding today's availability for both doctors...");
    // Get today's day of week (0-6, where 0 = Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Add availability for Dr. Smith today
    await db.insert(availabilities).values({
      doctorId: drSmithId,
      dayOfWeek,
      startHour: 9,
      endHour: 17
    });
    
    // Add availability for Dr. Jones today
    await db.insert(availabilities).values({
      doctorId: drJonesId,
      dayOfWeek,
      startHour: 9,
      endHour: 17
    });
    
    console.log("Creating some test patients...");
    const patient1Id = uuidv4();
    await db.insert(patients).values({
      id: patient1Id,
      name: 'John Smith',
      mrn: 'MRN001',
      mobile: '+1234567890',
      email: 'john@example.com',
      dateOfBirth: new Date('1980-05-15'),
      gender: 'male'
    });
    console.log(`Created patient John Smith with ID: ${patient1Id}`);
    
    const patient2Id = uuidv4();
    await db.insert(patients).values({
      id: patient2Id,
      name: 'Jane Doe',
      mrn: 'MRN002',
      mobile: '+0987654321',
      email: 'jane@example.com',
      dateOfBirth: new Date('1975-10-20'),
      gender: 'female'
    });
    console.log(`Created patient Jane Doe with ID: ${patient2Id}`);
    
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