// setup-demo-data.js
// Script to set up demo data for appointment vs walk-in testing

import { db } from "./server/db.js";
import { 
  departments, 
  doctors, 
  availabilities, 
  patients, 
  tokens,
  users 
} from "./shared/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "./server/auth.js";
import { v4 as uuidv4 } from 'uuid';
import { format, addDays } from 'date-fns';

// Add a delay to handle async operations
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function setupDemoData() {
  try {
    console.log("Starting demo data setup...");
    
    // Create admin user if it doesn't exist
    const adminExists = await db.select().from(users).where(eq(users.username, 'admin'));
    if (adminExists.length === 0) {
      console.log("Creating admin user...");
      await db.insert(users).values({
        username: 'admin',
        password: await hashPassword('admin123'),
        name: 'Admin User',
        role: 'admin',
        active: true
      });
    }
    
    // Create staff user if it doesn't exist
    const staffExists = await db.select().from(users).where(eq(users.username, 'staff'));
    if (staffExists.length === 0) {
      console.log("Creating staff user...");
      await db.insert(users).values({
        username: 'staff',
        password: await hashPassword('staff123'),
        name: 'Staff User',
        role: 'staff',
        departmentCode: 'opd-demo',
        active: true
      });
    }
    
    // Create a department for OPD consultations
    console.log("Setting up department...");
    const deptExists = await db.select().from(departments).where(eq(departments.code, 'opd-demo'));
    
    if (deptExists.length === 0) {
      await db.insert(departments).values({
        code: 'opd-demo',
        name: 'OPD Demonstration',
        category: 'opd_consultation',
        avgServiceTime: '15',
        active: true
      });
    } else {
      await db.update(departments)
        .set({ 
          name: 'OPD Demonstration', 
          category: 'opd_consultation',
          avgServiceTime: '15',
          active: true
        })
        .where(eq(departments.code, 'opd-demo'));
    }
    
    // Create doctors
    console.log("Setting up doctors...");
    const doctors_data = [
      {
        id: 'dr-smith',
        name: 'Dr. Smith',
        departmentCode: 'opd-demo',
        specialization: 'General Medicine',
        appointmentSlotsPerHour: 3,
        walkInSlotsPerHour: 2,
        active: true
      },
      {
        id: 'dr-jones',
        name: 'Dr. Jones',
        departmentCode: 'opd-demo',
        specialization: 'Cardiology',
        appointmentSlotsPerHour: 4,
        walkInSlotsPerHour: 1,
        active: true
      }
    ];
    
    for (const doctor of doctors_data) {
      const doctorExists = await db.select().from(doctors).where(eq(doctors.id, doctor.id));
      
      if (doctorExists.length === 0) {
        await db.insert(doctors).values(doctor);
      } else {
        await db.update(doctors)
          .set(doctor)
          .where(eq(doctors.id, doctor.id));
      }
    }
    
    // Create availabilities for doctors
    console.log("Setting up doctor availabilities...");
    // Clear existing availabilities
    await db.delete(availabilities)
      .where(eq(availabilities.doctorId, 'dr-smith'));
    
    await db.delete(availabilities)
      .where(eq(availabilities.doctorId, 'dr-jones'));
    
    // Add availabilities for Dr. Smith (Monday, Wednesday, Friday)
    const smithAvailabilities = [
      { doctorId: 'dr-smith', dayOfWeek: 1, startHour: 9, endHour: 13 },  // Monday morning
      { doctorId: 'dr-smith', dayOfWeek: 3, startHour: 9, endHour: 13 },  // Wednesday morning
      { doctorId: 'dr-smith', dayOfWeek: 5, startHour: 14, endHour: 18 }  // Friday afternoon
    ];
    
    // Add availabilities for Dr. Jones (Tuesday, Thursday, Saturday)
    const jonesAvailabilities = [
      { doctorId: 'dr-jones', dayOfWeek: 2, startHour: 9, endHour: 13 },   // Tuesday morning
      { doctorId: 'dr-jones', dayOfWeek: 4, startHour: 14, endHour: 18 },  // Thursday afternoon
      { doctorId: 'dr-jones', dayOfWeek: 6, startHour: 9, endHour: 12 }    // Saturday morning
    ];
    
    // Add today's availability for both doctors (for demo purposes)
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Add availability for today for both doctors (9 AM to 5 PM)
    smithAvailabilities.push({ 
      doctorId: 'dr-smith', 
      dayOfWeek: todayDayOfWeek, 
      startHour: 9, 
      endHour: 17 
    });
    
    jonesAvailabilities.push({ 
      doctorId: 'dr-jones', 
      dayOfWeek: todayDayOfWeek, 
      startHour: 9, 
      endHour: 17 
    });
    
    // Insert availabilities for both doctors
    for (const avail of [...smithAvailabilities, ...jonesAvailabilities]) {
      await db.insert(availabilities).values(avail);
    }
    
    // Create some sample patients
    console.log("Setting up sample patients...");
    const samplePatients = [
      {
        id: uuidv4(),
        name: 'John Smith',
        mrn: 'MRN001',
        mobile: '+1234567890',
        email: 'john@example.com',
        dateOfBirth: new Date('1980-05-15'),
        gender: 'male'
      },
      {
        id: uuidv4(),
        name: 'Jane Doe',
        mrn: 'MRN002',
        mobile: '+0987654321',
        email: 'jane@example.com',
        dateOfBirth: new Date('1975-10-20'),
        gender: 'female'
      },
      {
        id: uuidv4(),
        name: 'Bob Johnson',
        mrn: 'MRN003',
        mobile: '+1122334455',
        email: 'bob@example.com',
        dateOfBirth: new Date('1990-03-25'),
        gender: 'male'
      },
      {
        id: uuidv4(),
        name: 'Alice Williams',
        mrn: 'MRN004',
        mobile: '+5544332211',
        email: 'alice@example.com',
        dateOfBirth: new Date('1985-12-10'),
        gender: 'female'
      }
    ];
    
    for (const patient of samplePatients) {
      const existingPatient = await db.select().from(patients).where(eq(patients.mrn, patient.mrn));
      if (existingPatient.length === 0) {
        await db.insert(patients).values(patient);
      }
    }
    
    // Get patient IDs for creating tokens
    const patientsList = await db.select().from(patients);
    
    // Create some sample tokens with different statuses and types
    console.log("Setting up sample tokens for today...");
    // Clear existing tokens for demo purposes
    await db.delete(tokens);
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Only create tokens if current hour is between 8 AM and 5 PM for demo purposes
    if (currentHour >= 8 && currentHour < 17) {
      // Some walk-in tokens for today
      const walkInTokens = [
        {
          id: uuidv4(),
          tokenNumber: 'OPD-001',
          departmentCode: 'opd-demo',
          patientId: patientsList[0].id,
          priority: 'normal',
          status: 'waiting',
          source: 'walk-in',
          doctorId: 'dr-smith',
          issuedAt: new Date(new Date().setHours(currentHour, 0, 0)),
          checkInAt: new Date(new Date().setHours(currentHour, 0, 0))
        },
        {
          id: uuidv4(),
          tokenNumber: 'OPD-002',
          departmentCode: 'opd-demo',
          patientId: patientsList[1].id,
          priority: 'urgent',
          status: 'waiting',
          source: 'walk-in',
          doctorId: 'dr-smith',
          issuedAt: new Date(new Date().setHours(currentHour, 15, 0)),
          checkInAt: new Date(new Date().setHours(currentHour, 15, 0))
        }
      ];
      
      // Some appointment tokens
      const appointmentTokens = [
        {
          id: uuidv4(),
          tokenNumber: 'OPD-003',
          departmentCode: 'opd-demo',
          patientId: patientsList[2].id,
          priority: 'normal',
          status: 'booked',
          source: 'appointment',
          doctorId: 'dr-jones',
          issuedAt: new Date(new Date().setHours(currentHour - 2, 0, 0)),
          appointmentTime: new Date(new Date().setHours(currentHour + 1, 0, 0))
        },
        {
          id: uuidv4(),
          tokenNumber: 'OPD-004',
          departmentCode: 'opd-demo',
          patientId: patientsList[3].id,
          priority: 'normal',
          status: 'called', // Currently being served
          source: 'appointment',
          doctorId: 'dr-jones',
          issuedAt: new Date(new Date().setHours(currentHour - 3, 0, 0)),
          appointmentTime: new Date(new Date().setHours(currentHour - 1, 0, 0)),
          checkInAt: new Date(new Date().setHours(currentHour - 1, 0, 0)),
          calledAt: new Date()
        }
      ];
      
      // Insert tokens
      for (const token of [...walkInTokens, ...appointmentTokens]) {
        await db.insert(tokens).values(token);
      }
    }
    
    console.log("Demo data setup completed successfully!");
  } catch (error) {
    console.error("Error setting up demo data:", error);
  }
}

// Run the setup function
setupDemoData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error during setup:", error);
    process.exit(1);
  });