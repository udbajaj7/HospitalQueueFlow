import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import session from "express-session";
import memorystore from "memorystore";
import { storage } from "./storage";
import { 
  validateRequest, 
  checkRole, 
  WebSocketMessageTypes,
  WebSocketMessage,
} from "./utils";
import {
  isAuthenticated,
  login,
  logout,
  register,
  getCurrentUser,
  createInitialAdminUser,
} from "./auth";
import { db } from "./db";
import { tokens, patients, departments } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sendTokenCreationMessage, sendTokenCalledMessage } from "./twilio";
import {
  insertPatientSchema,
  insertTokenSchema,
  insertDepartmentSchema,
  insertUserSchema,
  insertDoctorSchema,
  RoleEnum,
  StatusEnum,
} from "@shared/schema";

// Configure session store
const MemoryStore = memorystore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup sessions
  app.use(
    session({
      cookie: { 
        maxAge: 86400000, // 24 hours
        httpOnly: true,
        path: '/'
      },
      store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "rgcirc-queue-management-secret"
    })
  );
  
  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true });
  
  // WebSocket connection handling
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send initial welcome message
    ws.send(JSON.stringify({
      type: 'connection.established',
      payload: { message: 'Connected to RGCIRC Queue Management System' }
    }));
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // Broadcast WebSocket message to all clients
  const broadcastMessage = (message: WebSocketMessage) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };

  // Initialize database
  createInitialAdminUser();
  
  // API Routes
  
  // Auth routes
  app.post('/api/login', login);
  app.post('/api/logout', logout);
  app.get('/api/user', getCurrentUser);
  
  // Patient routes
  app.post('/api/patients', validateRequest(insertPatientSchema), async (req, res) => {
    try {
      const patient = await storage.createPatient(req.body);
      res.status(201).json(patient);
    } catch (error) {
      console.error('Error creating patient:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Token routes
  app.post('/api/tokens', validateRequest(insertTokenSchema), async (req, res) => {
    try {
      // Create token
      console.log('Creating token with data:', req.body);
      
      // Validate required fields
      if (!req.body.patientId) {
        return res.status(400).json({ message: 'Patient ID is required' });
      }
      
      if (!req.body.departmentCode) {
        return res.status(400).json({ message: 'Department code is required' });
      }
      
      const token = await storage.createToken(req.body);
      console.log('Token created successfully:', token);
      
      // Send WebSocket notification
      broadcastMessage({
        type: WebSocketMessageTypes.TOKEN_CREATED,
        payload: token
      });
      
      // Send WhatsApp notification
      if (token.patient.mobile) {
        sendTokenCreationMessage(token).catch(error => {
          console.error('Error sending WhatsApp message:', error);
        });
      }
      
      res.status(201).json(token);
    } catch (error) {
      console.error('Error creating token:', error);
      let errorMessage = 'Failed to generate token';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });
  
  app.put('/api/tokens/:id/status', isAuthenticated, checkRole([RoleEnum.STAFF, RoleEnum.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!Object.values(StatusEnum).includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const token = await storage.updateTokenStatus(id, status);
      
      if (!token) {
        return res.status(404).json({ message: 'Token not found' });
      }
      
      // Send WebSocket notification based on status
      let messageType = '';
      switch (status) {
        case StatusEnum.CALLED:
          messageType = WebSocketMessageTypes.TOKEN_CALLED;
          // Send WhatsApp notification when token is called
          sendTokenCalledMessage(id).catch(error => {
            console.error('Error sending WhatsApp message:', error);
          });
          
          // Also send a current token update to update the displayed patient
          broadcastMessage({
            type: WebSocketMessageTypes.CURRENT_TOKEN_UPDATE,
            payload: token
          });
          break;
        case StatusEnum.SERVED:
          messageType = WebSocketMessageTypes.TOKEN_SERVED;
          // Clear current token when patient is served
          broadcastMessage({
            type: WebSocketMessageTypes.CURRENT_TOKEN_UPDATE,
            payload: null
          });
          break;
        case StatusEnum.NO_SHOW:
          messageType = WebSocketMessageTypes.TOKEN_NO_SHOW;
          // Clear current token when patient is marked as no-show
          broadcastMessage({
            type: WebSocketMessageTypes.CURRENT_TOKEN_UPDATE,
            payload: null
          });
          break;
        default:
          messageType = WebSocketMessageTypes.QUEUE_UPDATE;
      }
      
      broadcastMessage({
        type: messageType,
        payload: token
      });
      
      res.json(token);
    } catch (error) {
      console.error('Error updating token status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Queue routes
  app.get('/api/queues', isAuthenticated, async (req, res) => {
    try {
      const { department } = req.query;
      
      if (department && typeof department === 'string') {
        const tokens = await storage.listTokensByDepartment(department);
        return res.json(tokens);
      }
      
      const tokens = await storage.listActiveTokens();
      res.json(tokens);
    } catch (error) {
      console.error('Error fetching queue:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get current token (CALLED status)
  app.get('/api/current-token', isAuthenticated, async (req, res) => {
    try {
      const { department } = req.query;
      
      const results = await db
        .select({
          id: tokens.id,
          tokenNumber: tokens.tokenNumber,
          departmentCode: tokens.departmentCode,
          departmentName: departments.name,
          patientName: patients.name,
          patientMobile: patients.mobile,
          priority: tokens.priority,
          status: tokens.status,
          issuedAt: tokens.issuedAt,
          calledAt: tokens.calledAt,
          isWalkIn: tokens.isWalkIn,
        })
        .from(tokens)
        .leftJoin(patients, eq(tokens.patientId, patients.id))
        .leftJoin(departments, eq(tokens.departmentCode, departments.code))
        .where(
          and(
            department && typeof department === 'string'
              ? eq(tokens.departmentCode, department)
              : undefined, // If no department, don't filter by it
            eq(tokens.status, StatusEnum.CALLED)
          )
        );
      
      if (results.length === 0) {
        console.log('No current token found');
        return res.json(null);
      }
      
      // Get the most recently called token
      const sortedTokens = [...results].sort((a, b) => {
        // Convert calledAt (or fall back to issuedAt) to dates for comparison 
        const dateA = new Date(a.calledAt || a.issuedAt).getTime();
        const dateB = new Date(b.calledAt || b.issuedAt).getTime();
        return dateB - dateA; // Most recent first
      });
      
      // Get the token
      const currentToken = sortedTokens[0];
      const issuedTime = new Date(currentToken.issuedAt);
      const currentTime = new Date();
      const waitTimeInMinutes = Math.floor(
        (currentTime.getTime() - issuedTime.getTime()) / (1000 * 60)
      );
      
      // Format timestamps for consistent serialization
      const issuedAtStr = currentToken.issuedAt instanceof Date 
        ? currentToken.issuedAt.toISOString() 
        : new Date(currentToken.issuedAt).toISOString();
        
      const calledAtStr = currentToken.calledAt instanceof Date 
        ? currentToken.calledAt.toISOString() 
        : currentToken.calledAt 
          ? new Date(currentToken.calledAt).toISOString() 
          : null;
      
      const resultToken = {
        id: currentToken.id,
        tokenNumber: currentToken.tokenNumber,
        department: currentToken.departmentName,
        departmentCode: currentToken.departmentCode,
        patientName: currentToken.patientName,
        patientMobile: currentToken.patientMobile,
        priority: currentToken.priority,
        status: currentToken.status,
        waitTime: waitTimeInMinutes,
        issuedAt: issuedAtStr,
        calledAt: calledAtStr,
        isWalkIn: currentToken.isWalkIn
      };
      
      console.log('Current token:', resultToken);
      return res.json(resultToken);
    } catch (error) {
      console.error('Error fetching current token:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Department routes
  app.get('/api/departments', async (req, res) => {
    try {
      const departments = await storage.listDepartments();
      res.json(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/departments', isAuthenticated, checkRole([RoleEnum.ADMIN]), validateRequest(insertDepartmentSchema), async (req, res) => {
    try {
      const department = await storage.createDepartment(req.body);
      
      // Notify clients of department update
      broadcastMessage({
        type: WebSocketMessageTypes.DEPARTMENT_UPDATE,
        payload: { departments: await storage.listDepartments() }
      });
      
      res.status(201).json(department);
    } catch (error) {
      console.error('Error creating department:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.put('/api/departments/:code', isAuthenticated, checkRole([RoleEnum.ADMIN]), async (req, res) => {
    try {
      const { code } = req.params;
      const department = await storage.updateDepartment(code, req.body);
      
      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }
      
      // Notify clients of department update
      broadcastMessage({
        type: WebSocketMessageTypes.DEPARTMENT_UPDATE,
        payload: { departments: await storage.listDepartments() }
      });
      
      res.json(department);
    } catch (error) {
      console.error('Error updating department:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.delete('/api/departments/:code', isAuthenticated, checkRole([RoleEnum.ADMIN]), async (req, res) => {
    try {
      const { code } = req.params;
      const success = await storage.deleteDepartment(code);
      
      if (!success) {
        return res.status(404).json({ message: 'Department not found or could not be deleted' });
      }
      
      // Notify clients of department update
      broadcastMessage({
        type: WebSocketMessageTypes.DEPARTMENT_UPDATE,
        payload: { departments: await storage.listDepartments() }
      });
      
      res.json({ message: 'Department deleted successfully' });
    } catch (error) {
      console.error('Error deleting department:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // User routes
  app.get('/api/users', isAuthenticated, checkRole([RoleEnum.ADMIN]), async (req, res) => {
    try {
      const users = await storage.listUsers();
      // Remove passwords from response
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/users', isAuthenticated, checkRole([RoleEnum.ADMIN]), validateRequest(insertUserSchema), async (req, res) => {
    try {
      await register(req, res);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.put('/api/users/:id', isAuthenticated, checkRole([RoleEnum.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Don't allow password updates through this endpoint
      const { password, ...updateData } = req.body;
      
      const user = await storage.updateUser(userId, updateData);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Stats routes
  app.get('/api/stats/departments', async (req, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching department stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/stats/dashboard', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Token history route for reports
  app.get('/api/reports/token-history', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, department } = req.query;
      
      // Parse dates if provided, or use defaults
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;
      
      if (startDate && typeof startDate === 'string') {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({ message: 'Invalid start date format' });
        }
      }
      
      if (endDate && typeof endDate === 'string') {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({ message: 'Invalid end date format' });
        }
      }
      
      // Get department code if provided
      const departmentCode = department && typeof department === 'string' ? department : undefined;
      
      // Fetch token history
      const tokenHistory = await storage.listTokenHistory(
        parsedStartDate, 
        parsedEndDate,
        departmentCode
      );
      
      res.json(tokenHistory);
    } catch (error) {
      console.error('Error fetching token history:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Doctor routes
  app.get('/api/doctors', isAuthenticated, async (req, res) => {
    try {
      const { department } = req.query;
      let doctors;
      
      if (department && typeof department === 'string') {
        doctors = await storage.listDoctors(department);
      } else {
        doctors = await storage.listDoctors();
      }
      
      res.json(doctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/doctors', isAuthenticated, checkRole([RoleEnum.ADMIN]), validateRequest(insertDoctorSchema), async (req, res) => {
    try {
      const doctor = await storage.createDoctor(req.body);
      
      // Notify clients of doctor update through WebSocket
      broadcastMessage({
        type: WebSocketMessageTypes.DOCTOR_UPDATE,
        payload: { doctors: await storage.listDoctors() }
      });
      
      res.status(201).json(doctor);
    } catch (error) {
      console.error('Error creating doctor:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.put('/api/doctors/:id', isAuthenticated, checkRole([RoleEnum.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      const doctor = await storage.updateDoctor(id, req.body);
      
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      
      // Notify clients of doctor update
      broadcastMessage({
        type: WebSocketMessageTypes.DOCTOR_UPDATE,
        payload: { doctors: await storage.listDoctors() }
      });
      
      res.json(doctor);
    } catch (error) {
      console.error('Error updating doctor:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.delete('/api/doctors/:id', isAuthenticated, checkRole([RoleEnum.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDoctor(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Doctor not found or could not be deleted' });
      }
      
      // Notify clients of doctor update
      broadcastMessage({
        type: WebSocketMessageTypes.DOCTOR_UPDATE,
        payload: { doctors: await storage.listDoctors() }
      });
      
      res.json({ message: 'Doctor deleted successfully' });
    } catch (error) {
      console.error('Error deleting doctor:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Token-Doctor association route
  app.put('/api/tokens/:id/assign-doctor', isAuthenticated, checkRole([RoleEnum.STAFF, RoleEnum.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      const { doctorId } = req.body;
      
      // If doctorId is empty string, treat it as null (unassign)
      const finalDoctorId = doctorId === '' ? null : doctorId;
      
      const token = await storage.assignDoctor(id, finalDoctorId);
      
      if (!token) {
        return res.status(404).json({ message: 'Token not found' });
      }
      
      // Send WebSocket notification
      broadcastMessage({
        type: WebSocketMessageTypes.QUEUE_UPDATE,
        payload: token
      });
      
      res.json(token);
    } catch (error) {
      console.error('Error assigning doctor to token:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Token-doctor assignment
  app.put('/api/tokens/:id/doctor', isAuthenticated, checkRole([RoleEnum.STAFF, RoleEnum.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      const { doctorId } = req.body;
      
      if (!doctorId) {
        return res.status(400).json({ message: 'Doctor ID is required' });
      }
      
      const token = await storage.assignDoctor(id, doctorId);
      
      if (!token) {
        return res.status(404).json({ message: 'Token not found' });
      }
      
      // Notify clients of queue update
      broadcastMessage({
        type: WebSocketMessageTypes.QUEUE_UPDATE,
        payload: token
      });
      
      res.json(token);
    } catch (error) {
      console.error('Error assigning doctor to token:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Token timestamp updates (check-in, start, end)
  app.put('/api/tokens/:id/timestamp', isAuthenticated, checkRole([RoleEnum.STAFF, RoleEnum.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      const { field } = req.body;
      
      if (field !== 'checkInAt' && field !== 'startAt' && field !== 'endAt') {
        return res.status(400).json({ message: 'Invalid timestamp field' });
      }
      
      const token = await storage.updateTokenTimestamp(id, field);
      
      if (!token) {
        return res.status(404).json({ message: 'Token not found' });
      }
      
      // Notify clients of queue update
      broadcastMessage({
        type: WebSocketMessageTypes.QUEUE_UPDATE,
        payload: token
      });
      
      // Also invalidate the current token endpoint data
      broadcastMessage({
        type: WebSocketMessageTypes.CURRENT_TOKEN_UPDATE,
        payload: token
      });
      
      res.json(token);
    } catch (error) {
      console.error('Error updating token timestamp:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Wait time prediction
  app.get('/api/predict', async (req, res) => {
    try {
      const { dept } = req.query;
      
      if (!dept || typeof dept !== 'string') {
        return res.status(400).json({ message: 'Department code is required' });
      }
      
      const waitTime = await storage.calculateEstimatedWait(dept);
      res.json({ estimatedWait: waitTime });
    } catch (error) {
      console.error('Error predicting wait time:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // WebSocket upgrade handling
  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const url = request.url || '';
      const host = request.headers.host || '';
      const fullUrl = `http://${host}${url}`;
      console.log(`WebSocket upgrade request received: ${fullUrl}`);
      
      const parsedUrl = new URL(url, `http://${host}`);
      const pathname = parsedUrl.pathname;
      
      console.log(`Parsed WebSocket pathname: ${pathname}`);
      
      // Accept connections to both /ws and /api/ws for compatibility
      if (pathname === '/ws' || pathname === '/api/ws') {
        console.log(`Handling WebSocket upgrade for ${pathname}`);
        wss.handleUpgrade(request, socket, head, (ws) => {
          console.log('WebSocket connection established');
          wss.emit('connection', ws, request);
        });
      } else {
        console.log(`Ignoring WebSocket upgrade for non-matching path: ${pathname}`);
        socket.destroy();
      }
    } catch (error) {
      console.error('Error in WebSocket upgrade handler:', error);
      socket.destroy();
    }
  });

  // Create explicit routes for WebSocket health checks
  app.get('/api/ws', (req, res) => {
    res.status(200).json({ status: 'WebSocket server is running' });
  });
  
  app.get('/ws', (req, res) => {
    res.status(200).json({ status: 'WebSocket server is running' });
  });

  return httpServer;
}
