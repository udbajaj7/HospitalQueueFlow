import { db, pool } from "./db";
import { and, desc, eq, gte, lte, sql, not, inArray, between, gt } from "drizzle-orm";
import { formatISO, startOfDay, format, parse, addMinutes, isBefore, isAfter, getDay, getHours } from "date-fns";
import {
  departments,
  patients,
  tokens,
  users,
  doctors,
  notificationLogs,
  availabilities,
  type User,
  type InsertUser,
  type Patient,
  type InsertPatient,
  type Token,
  type InsertToken,
  type Department,
  type InsertDepartment,
  type Doctor,
  type InsertDoctor,
  type NotificationLog,
  type InsertNotificationLog,
  type TokenResponse,
  type QueueItem,
  type DepartmentStat,
  type DashboardStats,
  type Availability,
  type InsertAvailability,
  type AvailabilityWindow,
  type DoctorSlot,
  StatusEnum,
  DepartmentCategoryEnum,
  PriorityEnum,
  TokenSourceEnum,
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
  // Patient methods
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByMRN(mrn: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  
  // Token methods
  getToken(id: string): Promise<Token | undefined>;
  createToken(token: InsertToken): Promise<TokenResponse>;
  updateTokenStatus(id: string, status: string, timestamp?: Date): Promise<Token | undefined>;
  listTokensByDepartment(departmentCode: string): Promise<QueueItem[]>;
  listActiveTokens(): Promise<QueueItem[]>;
  listTokenHistory(startDate?: Date, endDate?: Date, departmentCode?: string): Promise<QueueItem[]>;
  assignDoctor(tokenId: string, doctorId: string): Promise<Token | undefined>;
  updateTokenTimestamp(tokenId: string, field: 'checkInAt' | 'startAt' | 'endAt'): Promise<Token | undefined>;
  
  // Department methods
  getDepartment(code: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(code: string, data: Partial<Department>): Promise<Department | undefined>;
  listDepartments(): Promise<Department[]>;
  deleteDepartment(code: string): Promise<boolean>;
  
  // Doctor methods
  getDoctor(id: string): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: string, data: Partial<Doctor>): Promise<Doctor | undefined>;
  listDoctors(departmentCode?: string): Promise<Doctor[]>;
  deleteDoctor(id: string): Promise<boolean>;
  
  // Doctor availability methods
  getDoctorAvailabilities(doctorId: string): Promise<Availability[]>;
  createDoctorAvailability(availability: InsertAvailability): Promise<Availability>;
  updateDoctorAvailability(id: string, data: Partial<Availability>): Promise<Availability | undefined>;
  deleteDoctorAvailability(id: string): Promise<boolean>;
  getDoctorSlot(doctorId: string, date: Date, hour: number): Promise<DoctorSlot>;
  checkDoctorAvailability(doctorId: string, date: Date, hour: number): Promise<boolean>;
  
  // Stats methods
  getDepartmentStats(): Promise<DepartmentStat[]>;
  getDashboardStats(): Promise<DashboardStats>;
  
  // Notification methods
  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;
  
  // Helper methods
  generateTokenNumber(departmentCode: string): Promise<string>;
  calculateEstimatedWait(departmentCode: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async listUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.name);
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientByMRN(mrn: string): Promise<Patient | undefined> {
    if (!mrn) return undefined;
    const [patient] = await db.select().from(patients).where(eq(patients.mrn, mrn));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async getToken(id: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
    return token;
  }

  async createToken(tokenData: InsertToken): Promise<TokenResponse> {
    // Generate token number
    const tokenNumber = await this.generateTokenNumber(tokenData.departmentCode);
    
    // Calculate estimated wait time
    const estimatedWait = await this.calculateEstimatedWait(tokenData.departmentCode);
    
    // Get department to check if it's OPD consultation
    const department = await this.getDepartment(tokenData.departmentCode);
    
    // Initialize source as walk-in if not specified
    const source = tokenData.source || TokenSourceEnum.WALKIN;
    const now = new Date();
    
    // For OPD Consultation, check doctor availability and slot capacity
    let doctorId = tokenData.doctorId;
    if (department && department.category === DepartmentCategoryEnum.OPD_CONSULTATION && doctorId) {
      // If this is a walk-in request for a specific doctor, verify slots are available
      if (source === TokenSourceEnum.WALKIN) {
        // Get current hour for availability check
        const currentHour = now.getHours();
        
        // Check if doctor is available now
        const isAvailable = await this.checkDoctorAvailability(doctorId, now, currentHour);
        if (!isAvailable) {
          throw new Error("Doctor is not available during this hour");
        }
        
        // Check if walk-in slots are available
        const slot = await this.getDoctorSlot(doctorId, now, currentHour);
        if (slot.remainingWalkInSlots <= 0) {
          throw new Error("No walk-in slots available for this doctor at this time");
        }
      }
      // For appointments, we'll validate the appointment time in the route handler
    }
    
    // Set the check-in time for walk-ins
    let checkInAt = undefined;
    if (source === TokenSourceEnum.WALKIN) {
      checkInAt = now;
    }
    
    // Create token
    const [token] = await db
      .insert(tokens)
      .values({ 
        ...tokenData, 
        tokenNumber, 
        doctorId,
        source,
        checkInAt
      })
      .returning();

    // Get patient details
    const patient = (await this.getPatient(token.patientId))!;

    return {
      ...token,
      patient,
      estimatedWait,
    };
  }

  async updateTokenStatus(
    id: string,
    status: string,
    timestamp = new Date()
  ): Promise<Token | undefined> {
    const updateData: any = { status };
    
    // Update appropriate timestamp based on status
    if (status === StatusEnum.CALLED) {
      updateData.calledAt = timestamp;
    } else if (status === StatusEnum.SERVED || status === StatusEnum.NO_SHOW) {
      updateData.servedAt = timestamp;
    }

    const [updatedToken] = await db
      .update(tokens)
      .set(updateData)
      .where(eq(tokens.id, id))
      .returning();
    
    return updatedToken;
  }

  async listTokensByDepartment(departmentCode: string): Promise<QueueItem[]> {
    const results = await db
      .select({
        id: tokens.id,
        tokenNumber: tokens.tokenNumber,
        departmentCode: tokens.departmentCode,
        priority: tokens.priority,
        status: tokens.status,
        issuedAt: tokens.issuedAt,
        calledAt: tokens.calledAt,
        servedAt: tokens.servedAt,
        patientId: tokens.patientId,
        patientName: patients.name,
        patientMobile: patients.mobile,
        departmentName: departments.name,
        departmentCategory: departments.category,
        doctorId: tokens.doctorId,
      })
      .from(tokens)
      .leftJoin(patients, eq(tokens.patientId, patients.id))
      .leftJoin(departments, eq(tokens.departmentCode, departments.code))
      .where(
        and(
          eq(tokens.departmentCode, departmentCode),
          not(eq(tokens.status, StatusEnum.SERVED)), // Don't filter out CALLED tokens
          sql`${tokens.issuedAt} >= ${formatISO(startOfDay(new Date()))}` // Only include tokens from today
        )
      )
      .orderBy(tokens.issuedAt);
    
    // Get doctors data for any tokens with a doctorId
    const doctorIds = results
      .filter(r => r.doctorId !== null)
      .map(r => r.doctorId as string);
    
    const doctorsMap: Record<string, { id: string, name: string }> = {};
    
    if (doctorIds.length > 0) {
      const doctorsList = await db
        .select({
          id: doctors.id,
          name: doctors.name,
        })
        .from(doctors)
        .where(inArray(doctors.id, doctorIds));
      
      doctorsList.forEach((doc: { id: string, name: string }) => {
        doctorsMap[doc.id] = { id: doc.id, name: doc.name };
      });
    }

    return results.map(result => {
      const issuedTime = result.issuedAt ? new Date(result.issuedAt) : new Date();
      const currentTime = new Date();
      const waitTimeInMinutes = Math.floor(
        (currentTime.getTime() - issuedTime.getTime()) / (1000 * 60)
      );

      // Handle issuedAt safely for serialization
      let issuedAtStr: string;
      try {
        issuedAtStr = result.issuedAt instanceof Date
          ? result.issuedAt.toISOString()
          : result.issuedAt ? new Date(result.issuedAt).toISOString() : new Date().toISOString();
      } catch (e) {
        console.warn('Error formatting issuedAt date:', e);
        issuedAtStr = new Date().toISOString(); // Fallback to current time
      }
      
      // Format calledAt
      let calledAtStr: string | null = null;
      if (result.calledAt) {
        try {
          calledAtStr = result.calledAt instanceof Date
            ? result.calledAt.toISOString()
            : new Date(result.calledAt).toISOString();
        } catch (e) {
          console.warn('Error formatting calledAt date:', e);
        }
      }
      
      // Format servedAt
      let servedAtStr: string | null = null;
      if (result.servedAt) {
        try {
          servedAtStr = result.servedAt instanceof Date
            ? result.servedAt.toISOString()
            : new Date(result.servedAt).toISOString();
        } catch (e) {
          console.warn('Error formatting servedAt date:', e);
        }
      }
      
      // Get doctor data if available
      const doctorData = result.doctorId ? doctorsMap[result.doctorId] : null;

      return {
        id: result.id,
        tokenNumber: result.tokenNumber,
        department: result.departmentName,
        departmentCode: result.departmentCode,
        departmentCategory: result.departmentCategory,
        patientName: result.patientName,
        patientMobile: result.patientMobile,
        priority: result.priority,
        status: result.status,
        waitTime: waitTimeInMinutes,
        issuedAt: issuedAtStr,
        calledAt: calledAtStr,
        servedAt: servedAtStr,
        doctorId: result.doctorId,
        doctorName: doctorData?.name || null,
      };
    });
  }

  async listTokenHistory(startDate?: Date, endDate?: Date, departmentCode?: string): Promise<QueueItem[]> {
    // Default to last 30 days if no startDate provided
    if (!startDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }
    
    // Default to current date if no endDate provided
    if (!endDate) {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Build the where condition
    const conditions = [];
    
    // Add date range condition
    conditions.push(
      sql`${tokens.issuedAt} >= ${formatISO(startDate)} AND ${tokens.issuedAt} <= ${formatISO(endDate)}`
    );
    
    // Add department filter if provided
    if (departmentCode) {
      conditions.push(eq(tokens.departmentCode, departmentCode));
    }
    
    // Execute the query
    const results = await db
      .select({
        id: tokens.id,
        tokenNumber: tokens.tokenNumber,
        departmentCode: tokens.departmentCode,
        priority: tokens.priority,
        status: tokens.status,
        issuedAt: tokens.issuedAt,
        calledAt: tokens.calledAt,
        servedAt: tokens.servedAt,
        patientId: tokens.patientId,
        patientName: patients.name,
        patientMobile: patients.mobile,
        departmentName: departments.name,
        departmentCategory: departments.category,
        doctorId: tokens.doctorId,
      })
      .from(tokens)
      .leftJoin(patients, eq(tokens.patientId, patients.id))
      .leftJoin(departments, eq(tokens.departmentCode, departments.code))
      .where(and(...conditions))
      .orderBy(desc(tokens.issuedAt));
    
    // Get doctors data for any tokens with a doctorId
    const doctorIds = results
      .filter(r => r.doctorId !== null)
      .map(r => r.doctorId as string);
    
    const doctorsMap: Record<string, { id: string, name: string }> = {};
    
    if (doctorIds.length > 0) {
      const doctorsList = await db
        .select({
          id: doctors.id,
          name: doctors.name,
        })
        .from(doctors)
        .where(inArray(doctors.id, doctorIds));
      
      doctorsList.forEach((doc: { id: string, name: string }) => {
        doctorsMap[doc.id] = { id: doc.id, name: doc.name };
      });
    }
    
    return results.map(result => {
      // Calculate wait time
      const issuedTime = result.issuedAt ? new Date(result.issuedAt) : new Date();
      let waitTimeInMinutes = 0;
      
      if (result.servedAt) {
        // If token was served, calculate time between issued and served
        const servedTime = new Date(result.servedAt);
        waitTimeInMinutes = Math.floor(
          (servedTime.getTime() - issuedTime.getTime()) / (1000 * 60)
        );
      } else if (result.calledAt) {
        // If token was called but not served, calculate time from issued to called
        const calledTime = new Date(result.calledAt);
        waitTimeInMinutes = Math.floor(
          (calledTime.getTime() - issuedTime.getTime()) / (1000 * 60)
        );
      } else {
        // For other tokens, calculate wait time until now
        const currentTime = new Date();
        waitTimeInMinutes = Math.floor(
          (currentTime.getTime() - issuedTime.getTime()) / (1000 * 60)
        );
      }

      // Handle issuedAt safely for serialization
      let issuedAtStr: string;
      try {
        issuedAtStr = result.issuedAt instanceof Date
          ? result.issuedAt.toISOString()
          : result.issuedAt ? new Date(result.issuedAt).toISOString() : new Date().toISOString();
      } catch (e) {
        console.warn('Error formatting issuedAt date:', e);
        issuedAtStr = new Date().toISOString(); // Fallback to current time
      }
      
      // Format calledAt
      let calledAtStr: string | null = null;
      if (result.calledAt) {
        try {
          calledAtStr = result.calledAt instanceof Date
            ? result.calledAt.toISOString()
            : new Date(result.calledAt).toISOString();
        } catch (e) {
          console.warn('Error formatting calledAt date:', e);
        }
      }
      
      // Format servedAt
      let servedAtStr: string | null = null;
      if (result.servedAt) {
        try {
          servedAtStr = result.servedAt instanceof Date
            ? result.servedAt.toISOString()
            : new Date(result.servedAt).toISOString();
        } catch (e) {
          console.warn('Error formatting servedAt date:', e);
        }
      }
      
      // Get doctor data if available
      const doctorData = result.doctorId ? doctorsMap[result.doctorId] : null;

      return {
        id: result.id,
        tokenNumber: result.tokenNumber,
        department: result.departmentName,
        departmentCode: result.departmentCode,
        departmentCategory: result.departmentCategory,
        patientName: result.patientName,
        patientMobile: result.patientMobile,
        priority: result.priority,
        status: result.status,
        waitTime: waitTimeInMinutes,
        issuedAt: issuedAtStr,
        calledAt: calledAtStr,
        servedAt: servedAtStr,
        doctorId: result.doctorId,
        doctorName: doctorData?.name || null,
      };
    });
  }

  async listActiveTokens(): Promise<QueueItem[]> {
    const results = await db
      .select({
        id: tokens.id,
        tokenNumber: tokens.tokenNumber,
        departmentCode: tokens.departmentCode,
        priority: tokens.priority,
        status: tokens.status,
        issuedAt: tokens.issuedAt,
        calledAt: tokens.calledAt,
        servedAt: tokens.servedAt,
        patientId: tokens.patientId,
        patientName: patients.name,
        patientMobile: patients.mobile,
        departmentName: departments.name,
        departmentCategory: departments.category,
        doctorId: tokens.doctorId,
      })
      .from(tokens)
      .leftJoin(patients, eq(tokens.patientId, patients.id))
      .leftJoin(departments, eq(tokens.departmentCode, departments.code))
      .where(
        and(
          sql`${tokens.issuedAt} >= ${formatISO(startOfDay(new Date()))}`,
          sql`${tokens.status} IN ('ISSUED', 'CALLED')`
        )
      )
      .orderBy(tokens.issuedAt);
      
    // Get doctors data for any tokens with a doctorId
    const doctorIds = results
      .filter(r => r.doctorId !== null)
      .map(r => r.doctorId as string);
    
    const doctorsMap: Record<string, { id: string, name: string }> = {};
    
    if (doctorIds.length > 0) {
      const doctorsList = await db
        .select({
          id: doctors.id,
          name: doctors.name,
        })
        .from(doctors)
        .where(inArray(doctors.id, doctorIds));
      
      doctorsList.forEach((doc: { id: string, name: string }) => {
        doctorsMap[doc.id] = { id: doc.id, name: doc.name };
      });
    }

    return results.map(result => {
      const issuedTime = result.issuedAt ? new Date(result.issuedAt) : new Date();
      const currentTime = new Date();
      const waitTimeInMinutes = Math.floor(
        (currentTime.getTime() - issuedTime.getTime()) / (1000 * 60)
      );

      // Handle issuedAt safely for serialization
      let issuedAtStr: string;
      try {
        issuedAtStr = result.issuedAt instanceof Date
          ? result.issuedAt.toISOString()
          : result.issuedAt ? new Date(result.issuedAt).toISOString() : new Date().toISOString();
      } catch (e) {
        console.warn('Error formatting issuedAt date:', e);
        issuedAtStr = new Date().toISOString(); // Fallback to current time
      }
      
      // Format calledAt
      let calledAtStr: string | null = null;
      if (result.calledAt) {
        try {
          calledAtStr = result.calledAt instanceof Date
            ? result.calledAt.toISOString()
            : new Date(result.calledAt).toISOString();
        } catch (e) {
          console.warn('Error formatting calledAt date:', e);
        }
      }
      
      // Format servedAt
      let servedAtStr: string | null = null;
      if (result.servedAt) {
        try {
          servedAtStr = result.servedAt instanceof Date
            ? result.servedAt.toISOString()
            : new Date(result.servedAt).toISOString();
        } catch (e) {
          console.warn('Error formatting servedAt date:', e);
        }
      }
      
      // Get doctor data if available
      const doctorData = result.doctorId ? doctorsMap[result.doctorId] : null;

      return {
        id: result.id,
        tokenNumber: result.tokenNumber,
        department: result.departmentName,
        departmentCode: result.departmentCode,
        departmentCategory: result.departmentCategory,
        patientName: result.patientName,
        patientMobile: result.patientMobile,
        priority: result.priority,
        status: result.status,
        waitTime: waitTimeInMinutes,
        issuedAt: issuedAtStr,
        calledAt: calledAtStr,
        servedAt: servedAtStr,
        doctorId: result.doctorId,
        doctorName: doctorData?.name || null,
      };
    });
  }

  async getDepartment(code: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.code, code));
    return department;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db.insert(departments).values(department).returning();
    return newDepartment;
  }

  async updateDepartment(code: string, data: Partial<Department>): Promise<Department | undefined> {
    const [updatedDepartment] = await db
      .update(departments)
      .set(data)
      .where(eq(departments.code, code))
      .returning();
    return updatedDepartment;
  }

  async listDepartments(): Promise<Department[]> {
    return db.select().from(departments).orderBy(departments.name);
  }

  async deleteDepartment(code: string): Promise<boolean> {
    try {
      await db.delete(departments).where(eq(departments.code, code));
      return true;
    } catch (error) {
      console.error('Error deleting department:', error);
      return false;
    }
  }

  async getDepartmentStats(): Promise<DepartmentStat[]> {
    const departmentList = await this.listDepartments();
    const stats: DepartmentStat[] = [];

    for (const dept of departmentList) {
      // Get current tokens in department
      const queueItems = await this.listTokensByDepartment(dept.code);
      
      // Get current token (first called, then oldest issued)
      const calledTokens = queueItems.filter(t => t.status === StatusEnum.CALLED);
      const currentToken = calledTokens.length > 0 
        ? calledTokens[0].tokenNumber 
        : queueItems.length > 0 
          ? queueItems[0].tokenNumber 
          : '';
      
      // Calculate average wait time
      const totalWaitTime = queueItems.reduce((sum, item) => sum + item.waitTime, 0);
      const avgWait = queueItems.length > 0 ? Math.round(totalWaitTime / queueItems.length) : 0;

      stats.push({
        code: dept.code,
        name: dept.name,
        currentToken,
        waitingCount: queueItems.length,
        avgWait,
      });
    }

    return stats;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get tokens from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();
      
      // Get counts directly using SQL to avoid timestamp issues
      const { rows: waitingRows } = await pool.query(
        `SELECT COUNT(*) FROM tokens WHERE issued_at >= $1 AND status IN ('ISSUED', 'CALLED')`, 
        [todayStr]
      );
      
      const { rows: servedRows } = await pool.query(
        `SELECT COUNT(*) FROM tokens WHERE issued_at >= $1 AND status = $2`, 
        [todayStr, StatusEnum.SERVED]
      );
      
      const { rows: noShowRows } = await pool.query(
        `SELECT COUNT(*) FROM tokens WHERE issued_at >= $1 AND status = $2`, 
        [todayStr, StatusEnum.NO_SHOW]
      );
      
      // Calculate average wait time
      const { rows: servedTokens } = await pool.query(
        `SELECT issued_at, served_at FROM tokens 
         WHERE issued_at >= $1 AND status = $2 AND served_at IS NOT NULL`,
        [todayStr, StatusEnum.SERVED]
      );
      
      let totalWaitMinutes = 0;
      let tokenCount = 0;
      
      for (const token of servedTokens) {
        if (token.issued_at && token.served_at) {
          try {
            const issuedAt = new Date(token.issued_at);
            const servedAt = new Date(token.served_at);
            const waitTimeMinutes = Math.floor(
              (servedAt.getTime() - issuedAt.getTime()) / (1000 * 60)
            );
            totalWaitMinutes += waitTimeMinutes;
            tokenCount++;
          } catch (e) {
            console.warn('Error calculating wait time:', e);
          }
        }
      }
      
      const avgWaitTime = tokenCount > 0 ? Math.round(totalWaitMinutes / tokenCount) : 0;

      return {
        waitingPatients: parseInt(waitingRows[0]?.count || '0'),
        servedToday: parseInt(servedRows[0]?.count || '0'),
        noShows: parseInt(noShowRows[0]?.count || '0'),
        avgWaitTime,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        waitingPatients: 0,
        servedToday: 0,
        noShows: 0,
        avgWaitTime: 0
      };
    }
  }

  async createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog> {
    const [newLog] = await db.insert(notificationLogs).values(log).returning();
    return newLog;
  }

  // Doctor methods
  async getDoctor(id: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));
    return doctor;
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [newDoctor] = await db.insert(doctors).values(doctor).returning();
    return newDoctor;
  }

  async updateDoctor(id: string, data: Partial<Doctor>): Promise<Doctor | undefined> {
    const [updatedDoctor] = await db
      .update(doctors)
      .set(data)
      .where(eq(doctors.id, id))
      .returning();
    return updatedDoctor;
  }

  async listDoctors(departmentCode?: string): Promise<Doctor[]> {
    if (departmentCode) {
      return db
        .select()
        .from(doctors)
        .where(eq(doctors.departmentCode, departmentCode))
        .orderBy(doctors.name);
    }
    
    return db.select().from(doctors).orderBy(doctors.name);
  }

  async deleteDoctor(id: string): Promise<boolean> {
    try {
      await db.delete(doctors).where(eq(doctors.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting doctor:', error);
      return false;
    }
  }
  
  async getDoctorAvailabilities(doctorId: string): Promise<Availability[]> {
    return await db
      .select()
      .from(availabilities)
      .where(eq(availabilities.doctorId, doctorId))
      .orderBy(availabilities.dayOfWeek, availabilities.startHour);
  }
  
  async createDoctorAvailability(availability: InsertAvailability): Promise<Availability> {
    // Check for overlapping time slots first
    const existingAvailabilities = await this.getDoctorAvailabilities(availability.doctorId);
    
    // Check if the new availability overlaps with any existing one for the same day
    const overlapping = existingAvailabilities.find(
      existing => 
        existing.dayOfWeek === availability.dayOfWeek &&
        ((availability.startHour < existing.endHour && availability.startHour >= existing.startHour) ||
        (availability.endHour <= existing.endHour && availability.endHour > existing.startHour) ||
        (availability.startHour <= existing.startHour && availability.endHour >= existing.endHour))
    );
    
    if (overlapping) {
      throw new Error(`Overlapping availability found for day ${availability.dayOfWeek}`);
    }
    
    // Create the new availability
    const [newAvailability] = await db
      .insert(availabilities)
      .values(availability)
      .returning();
      
    return newAvailability;
  }
  
  async updateDoctorAvailability(id: string, data: Partial<Availability>): Promise<Availability | undefined> {
    if (data.startHour !== undefined && data.endHour !== undefined && data.dayOfWeek !== undefined) {
      // Check for overlapping time slots, excluding this one
      const [currentAvailability] = await db
        .select()
        .from(availabilities)
        .where(eq(availabilities.id, id));
      
      if (!currentAvailability) {
        throw new Error(`Availability with id ${id} not found`);
      }
      
      const existingAvailabilities = await db
        .select()
        .from(availabilities)
        .where(
          and(
            eq(availabilities.doctorId, currentAvailability.doctorId),
            eq(availabilities.dayOfWeek, data.dayOfWeek), 
            not(eq(availabilities.id, id))
          )
        );
      
      // Check if the updated availability would overlap with any existing one
      const startHour = data.startHour!;
      const endHour = data.endHour!;
      
      const overlapping = existingAvailabilities.find(
        existing => 
          ((startHour < existing.endHour && startHour >= existing.startHour) ||
          (endHour <= existing.endHour && endHour > existing.startHour) ||
          (startHour <= existing.startHour && endHour >= existing.endHour))
      );
      
      if (overlapping) {
        throw new Error(`Overlapping availability found for day ${data.dayOfWeek}`);
      }
    }
    
    // Update the availability
    const [updatedAvailability] = await db
      .update(availabilities)
      .set(data)
      .where(eq(availabilities.id, id))
      .returning();
      
    return updatedAvailability;
  }
  
  async deleteDoctorAvailability(id: string): Promise<boolean> {
    try {
      const result = await db.delete(availabilities).where(eq(availabilities.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting availability:', error);
      return false;
    }
  }
  
  async checkDoctorAvailability(doctorId: string, date: Date, hour: number): Promise<boolean> {
    // Get the day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = getDay(date);
    
    // Find availabilities for this doctor on this day that include this hour
    const results = await db
      .select()
      .from(availabilities)
      .where(
        and(
          eq(availabilities.doctorId, doctorId),
          eq(availabilities.dayOfWeek, dayOfWeek),
          lte(availabilities.startHour, hour),
          gt(availabilities.endHour, hour)
        )
      );
      
    return results.length > 0;
  }
  
  async getDoctorSlot(doctorId: string, date: Date, hour: number): Promise<DoctorSlot> {
    // Default slot availability
    const defaultSlot: DoctorSlot = {
      bookedAppointments: 0,
      walkInsIssued: 0,
      appointmentSlotsPerHour: 0,
      walkInSlotsPerHour: 0,
      isAvailable: false,
      remainingWalkInSlots: 0
    };
    
    // Get doctor details
    const doctor = await this.getDoctor(doctorId);
    if (!doctor) {
      return defaultSlot;
    }
    
    // Check if doctor is available at this time
    const isAvailable = await this.checkDoctorAvailability(doctorId, date, hour);
    if (!isAvailable) {
      return {
        ...defaultSlot,
        appointmentSlotsPerHour: doctor.appointmentSlotsPerHour,
        walkInSlotsPerHour: doctor.walkInSlotsPerHour
      };
    }
    
    // Set start and end of the hour
    const startOfHour = new Date(date);
    startOfHour.setHours(hour, 0, 0, 0);
    
    const endOfHour = new Date(date);
    endOfHour.setHours(hour, 59, 59, 999);
    
    // Count booked appointments for this hour
    const bookedAppointments = await db
      .select({ count: sql<number>`count(*)` })
      .from(tokens)
      .where(
        and(
          eq(tokens.doctorId, doctorId),
          eq(tokens.source, TokenSourceEnum.APPOINTMENT),
          between(tokens.appointmentTime, startOfHour, endOfHour)
        )
      );
    
    // Count walk-ins for this hour
    const walkInsIssued = await db
      .select({ count: sql<number>`count(*)` })
      .from(tokens)
      .where(
        and(
          eq(tokens.doctorId, doctorId),
          eq(tokens.source, TokenSourceEnum.WALKIN),
          between(tokens.issuedAt, startOfHour, endOfHour)
        )
      );
    
    // Calculate remaining walk-in slots
    const bookedCount = bookedAppointments[0]?.count || 0;
    const walkInCount = walkInsIssued[0]?.count || 0;
    
    // Walk-in slots formula: If appointments are less than max, allow overflow to walk-ins
    const maxWalkInSlots = bookedCount < doctor.appointmentSlotsPerHour 
      ? doctor.walkInSlotsPerHour + (doctor.appointmentSlotsPerHour - bookedCount)
      : doctor.walkInSlotsPerHour;
      
    const remainingWalkInSlots = Math.max(0, maxWalkInSlots - walkInCount);
    
    return {
      bookedAppointments: bookedCount,
      walkInsIssued: walkInCount,
      appointmentSlotsPerHour: doctor.appointmentSlotsPerHour,
      walkInSlotsPerHour: doctor.walkInSlotsPerHour,
      isAvailable: true,
      remainingWalkInSlots
    };
  }

  // Token advanced methods
  async assignDoctor(tokenId: string, doctorId: string): Promise<Token | undefined> {
    const [updatedToken] = await db
      .update(tokens)
      .set({ doctorId })
      .where(eq(tokens.id, tokenId))
      .returning();
    return updatedToken;
  }

  async updateTokenTimestamp(tokenId: string, field: 'checkInAt' | 'startAt' | 'endAt'): Promise<Token | undefined> {
    const now = new Date();
    const updateData: any = {};
    updateData[field] = now;
    
    const [updatedToken] = await db
      .update(tokens)
      .set(updateData)
      .where(eq(tokens.id, tokenId))
      .returning();
    
    return updatedToken;
  }

  async generateTokenNumber(departmentCode: string): Promise<string> {
    try {
      // Get count of tokens for department today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();
      
      // Use raw pool query to avoid timestamp issues
      const { rows } = await pool.query(
        `SELECT COUNT(*) FROM tokens 
         WHERE department_code = $1 AND issued_at >= $2`,
        [departmentCode, todayStr]
      );
      
      const count = (parseInt(rows[0]?.count || '0') + 1);
      return `${departmentCode}-${count.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating token number:', error);
      // Fallback to a unique number based on current time in case of error
      const timestamp = Date.now();
      return `${departmentCode}-${timestamp.toString().slice(-3)}`;
    }
  }

  async calculateEstimatedWait(departmentCode: string): Promise<number> {
    // Get active tokens count
    const activeTokens = await this.listTokensByDepartment(departmentCode);
    
    // Get department average service time
    const department = await this.getDepartment(departmentCode);
    
    if (!department) {
      return 0;
    }
    
    // Ensure avgServiceTime is a number and estimate wait time
    const avgServiceTime = parseInt(department.avgServiceTime || '15');
    
    // If it's OPD Consultation, also check how many doctors are active
    let doctorCount = 1; // Default to 1 doctor
    
    if (department.category === DepartmentCategoryEnum.OPD_CONSULTATION) {
      const activeDoctors = await this.listDoctors(departmentCode);
      doctorCount = activeDoctors.filter(d => d.active).length || 1;
    }
    
    // Estimate wait time based on number of tokens and average service time
    // Divide by number of active doctors for OPD
    const estimatedWaitTime = Math.ceil((activeTokens.length * avgServiceTime) / doctorCount);
    
    return estimatedWaitTime;
  }
}

export const storage = new DatabaseStorage();