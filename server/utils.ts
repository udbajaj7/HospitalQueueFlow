import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { StatusEnum, PriorityEnum, RoleEnum, User } from "@shared/schema";
import { Session } from "express-session";

// Extend Session to include user property
declare module "express-session" {
  interface Session {
    user?: {
      id: number;
      username: string;
      name: string;
      role: string;
      departmentCode?: string;
    }
  }
}

// Error handler for Zod validation
export const validateRequest = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};

// Role checking middleware
export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.session.user;
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };
};

// WebSocket message types
export const WebSocketMessageTypes = {
  TOKEN_CREATED: 'token.created',
  TOKEN_CALLED: 'token.called',
  TOKEN_SERVED: 'token.served',
  TOKEN_NO_SHOW: 'token.no_show',
  TOKEN_DOCTOR_ASSIGNED: 'token.doctor.assigned',
  QUEUE_UPDATE: 'queue.update',
  DEPARTMENT_UPDATE: 'department.update',
  DOCTOR_UPDATE: 'doctor.update',
  CURRENT_TOKEN_UPDATE: 'current.token.update',
};

// WebSocket message format
export type WebSocketMessage = {
  type: string;
  payload: any;
};

// Function to format a minutes value into a readable time string
export function formatWaitTime(minutes: number): string {
  if (minutes < 1) return 'Less than a minute';
  
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  
  return `${hours} hour${hours === 1 ? '' : 's'} ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
}

// Function to create a token status text
export function getStatusText(status: string): string {
  return {
    [StatusEnum.ISSUED]: 'Waiting',
    [StatusEnum.CALLED]: 'Called',
    [StatusEnum.SERVED]: 'Served',
    [StatusEnum.NO_SHOW]: 'No-show',
  }[status] || status;
}

// Function to create a priority display text
export function getPriorityText(priority: string): string {
  return {
    [PriorityEnum.NORMAL]: 'Normal',
    [PriorityEnum.EMERGENCY]: 'Emergency',
    [PriorityEnum.FOLLOW_UP]: 'Follow-up',
  }[priority] || priority;
}

// Function to create a role display text
export function getRoleText(role: string): string {
  return {
    [RoleEnum.ADMIN]: 'Admin',
    [RoleEnum.STAFF]: 'Staff',
    [RoleEnum.KIOSK]: 'Kiosk',
  }[role] || role;
}
