import { Request, Response, NextFunction } from 'express';
import { compare, hash } from 'bcrypt';
import { storage } from './storage';
import { InsertUser, RoleEnum } from '@shared/schema';

const SALT_ROUNDS = 10;

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  return hash(password, SALT_ROUNDS);
};

// Verify password
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return compare(password, hashedPassword);
};

// Login handler
export const login = async (req: Request, res: Response) => {
  console.log('Login request received:', req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    console.log('Login failed: Missing username or password');
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await storage.getUserByUsername(username);
    console.log('User lookup result:', user ? 'Found' : 'Not found');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    console.log('Password validation:', isPasswordValid ? 'Valid' : 'Invalid');

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create session
    const userSession = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      departmentCode: user.departmentCode || undefined,
    };

    req.session.user = userSession;
    console.log('Session created for user:', userSession.username);

    // Ensure session is saved before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Failed to create session' });
      }
      
      console.log('Login successful, returning user data');
      return res.json({
        user: userSession,
        message: 'Login successful',
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Register/Create new user handler
export const register = async (req: Request, res: Response) => {
  const { username, password, name, role = RoleEnum.STAFF, departmentCode } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Check if username is taken
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await storage.createUser({
      username,
      password: hashedPassword,
      name,
      role,
      departmentCode,
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout handler
export const logout = async (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logout successful' });
  });
};

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log('isAuthenticated check, session:', req.session.id, 'user:', req.session.user ? 'exists' : 'not found');
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Get current user handler
export const getCurrentUser = (req: Request, res: Response) => {
  console.log('getCurrentUser, session:', req.session.id, 'user:', req.session.user ? 'exists' : 'not found');
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return res.json({ user: req.session.user });
};

// Create initial admin user if none exists
export const createInitialAdminUser = async () => {
  try {
    const users = await storage.listUsers();

    if (users.length === 0) {
      const password = await hashPassword('admin123');
      await storage.createUser({
        username: 'admin',
        password,
        name: 'Admin User',
        role: RoleEnum.ADMIN,
      });
      console.log('Created initial admin user (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('Error creating initial admin user:', error);
  }
};
