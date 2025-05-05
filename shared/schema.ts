import { pgTable, text, serial, timestamp, boolean, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums
export const PriorityEnum = {
  NORMAL: 'NORMAL',
  EMERGENCY: 'EMERGENCY',
  FOLLOW_UP: 'FOLLOW_UP',
} as const;

export const StatusEnum = {
  ISSUED: 'ISSUED',
  CALLED: 'CALLED',
  SERVED: 'SERVED',
  NO_SHOW: 'NO_SHOW',
} as const;

export const RoleEnum = {
  ADMIN: 'admin',
  STAFF: 'staff',
  KIOSK: 'kiosk',
} as const;

export const DepartmentCategoryEnum = {
  REGISTRATION: 'Registration',
  BILLING: 'Billing',
  SAMPLE_COLLECTION: 'Sample Collection',
  PHARMACY: 'Pharmacy',
  RADIOLOGY: 'Radiology',
  OPD_CONSULTATION: 'OPD Consultation',
} as const;

export const TokenSourceEnum = {
  WALKIN: 'walkin',
  APPOINTMENT: 'appointment',
} as const;

// Define database tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default(RoleEnum.STAFF),
  departmentCode: text("department_code"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  mrn: text("mrn").unique(),
  mobile: text("mobile").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tokens = pgTable("tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenNumber: text("token_number").notNull(),
  departmentCode: text("department_code").notNull(),
  priority: text("priority").notNull().default(PriorityEnum.NORMAL),
  status: text("status").notNull().default(StatusEnum.ISSUED),
  issuedAt: timestamp("issued_at").defaultNow(),
  calledAt: timestamp("called_at"),
  servedAt: timestamp("served_at"),
  patientId: uuid("patient_id").notNull(),
  doctorId: uuid("doctor_id"),
  checkInAt: timestamp("check_in_at"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  position: serial("position"), // For queue reordering
  source: text("source").notNull().default(TokenSourceEnum.WALKIN),
  appointmentTime: timestamp("appointment_time"), // For booked appointments
});

export const departments = pgTable("departments", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default(DepartmentCategoryEnum.REGISTRATION),
  slaThreshold: text("sla_threshold").notNull().default("30"),
  avgServiceTime: text("avg_service_time").notNull().default("15"),
});

export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  departmentCode: text("department_code").notNull().references(() => departments.code),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  appointmentSlotsPerHour: integer("appointment_slots_per_hour").notNull().default(4), // max booked appointments per hour
  walkInSlotsPerHour: integer("walk_in_slots_per_hour").notNull().default(2), // max walk-ins per hour
});

export const availabilities = pgTable("availabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday…6=Saturday
  startHour: integer("start_hour").notNull(), // 0–23
  endHour: integer("end_hour").notNull(), // 1–24, non-inclusive
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenId: uuid("token_id").notNull(),
  mobile: text("mobile").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define insert schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
  tokenNumber: true, // Token number is generated on the server
  issuedAt: true,
  calledAt: true,
  servedAt: true,
  checkInAt: true,
  startAt: true,
  endAt: true,
  position: true,
  doctorId: true, // Doctors are assigned later
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({});

export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertDoctorSchema = createInsertSchema(doctors).omit({
  id: true,
  createdAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availabilities).omit({
  id: true,
  createdAt: true,
});

// Define types from schemas
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Token = typeof tokens.$inferSelect;
export type InsertToken = z.infer<typeof insertTokenSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;

export type Availability = typeof availabilities.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

// Token response with patient data and estimated wait
export type TokenResponse = Token & {
  patient: Patient;
  estimatedWait: number;
};

// Queue item for real-time updates
export type QueueItem = {
  id: string;
  tokenNumber: string;
  department: string | null;
  departmentCode: string;
  departmentCategory: string | null;
  patientName: string | null;
  patientMobile: string | null;
  priority: string;
  status: string;
  waitTime: number;
  issuedAt: string;
  calledAt?: string | null;
  servedAt?: string | null;
  isWalkIn?: boolean;
  doctorId?: string | null;
  doctorName?: string | null;
};

// Department stats response
export type DepartmentStat = {
  code: string;
  name: string;
  currentToken: string;
  waitingCount: number;
  avgWait: number;
};

// Dashboard stats response
export type DashboardStats = {
  waitingPatients: number;
  servedToday: number;
  noShows: number;
  avgWaitTime: number;
};

// Doctor availability slot
export type DoctorSlot = {
  bookedAppointments: number;
  walkInsIssued: number;
  appointmentSlotsPerHour: number;
  walkInSlotsPerHour: number;
  isAvailable: boolean;
  remainingWalkInSlots: number;
};

// Availability window for frontend representation
export type AvailabilityWindow = {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  id?: string;
};
