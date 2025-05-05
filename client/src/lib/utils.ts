import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to create a role display text
export function getRoleText(role: string): string {
  return {
    'admin': 'Administrator',
    'staff': 'Staff',
    'kiosk': 'Kiosk',
  }[role] || role;
}

// Function to format wait time to human-readable format
export function formatWaitTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
}

// Function to get friendly status text
export function getStatusText(status: string): string {
  return {
    'ISSUED': 'Waiting',
    'CALLED': 'Called',
    'SERVED': 'Completed',
    'NO_SHOW': 'No Show',
  }[status] || status;
}

// Function to get friendly priority text
export function getPriorityText(priority: string): string {
  return {
    'NORMAL': 'Normal',
    'URGENT': 'Urgent',
    'EMERGENCY': 'Emergency',
  }[priority] || priority;
}
