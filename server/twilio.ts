import twilio from 'twilio';
import { TokenResponse } from '@shared/schema';
import { formatWaitTime } from './utils';
import { storage } from './storage';

// Initialize Twilio client with env vars
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;

let twilioClient: twilio.Twilio | null = null;

// Initialize Twilio client if credentials are available
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
} else {
  console.warn('Twilio credentials not found. WhatsApp notifications will be disabled.');
}

// Function to send WhatsApp message for token creation
export async function sendTokenCreationMessage(token: TokenResponse): Promise<boolean> {
  if (!twilioClient || !twilioWhatsAppFrom) {
    console.log('Twilio client not initialized. Message not sent.');
    return false;
  }

  try {
    const { patient, tokenNumber, departmentCode, estimatedWait } = token;
    
    // Format message
    const waitTimeText = formatWaitTime(estimatedWait);
    
    // Get department name
    const department = await storage.getDepartment(departmentCode);
    const departmentName = department?.name || departmentCode;
    
    const message = `
    *RGCIRC Queue Management*
    
    Hello ${patient.name},
    
    Your token has been generated:
    
    Token Number: *${tokenNumber}*
    Department: ${departmentName}
    Estimated Wait: ${waitTimeText}
    
    Please be available when your token is called.
    You will receive another notification when it's your turn.
    
    Thank you for choosing RGCIRC.
    `;

    // Send message
    const result = await twilioClient.messages.create({
      from: `whatsapp:${twilioWhatsAppFrom}`,
      to: `whatsapp:${patient.mobile}`,
      body: message.trim(),
    });

    // Log notification
    await storage.createNotificationLog({
      tokenId: token.id,
      mobile: patient.mobile,
      message: message,
      status: result.status,
    });

    console.log(`WhatsApp message sent for token ${tokenNumber}, SID: ${result.sid}`);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

// Function to send token called notification
export async function sendTokenCalledMessage(tokenId: string): Promise<boolean> {
  if (!twilioClient || !twilioWhatsAppFrom) {
    console.log('Twilio client not initialized. Message not sent.');
    return false;
  }

  try {
    // Get token with patient data
    const token = await storage.getToken(tokenId);
    if (!token) {
      console.error(`Token with ID ${tokenId} not found`);
      return false;
    }
    
    const patient = await storage.getPatient(token.patientId);
    if (!patient) {
      console.error(`Patient for token ${tokenId} not found`);
      return false;
    }
    
    // Get department name
    const department = await storage.getDepartment(token.departmentCode);
    const departmentName = department?.name || token.departmentCode;
    
    // Format message
    const message = `
    *RGCIRC Queue Management*
    
    Hello ${patient.name},
    
    Your token *${token.tokenNumber}* for ${departmentName} has been called.
    
    Please proceed to the department counter.
    
    Thank you for your patience.
    `;

    // Send message
    const result = await twilioClient.messages.create({
      from: `whatsapp:${twilioWhatsAppFrom}`,
      to: `whatsapp:${patient.mobile}`,
      body: message.trim(),
    });

    // Log notification
    await storage.createNotificationLog({
      tokenId: token.id,
      mobile: patient.mobile,
      message: message,
      status: result.status,
    });

    console.log(`WhatsApp token called message sent for ${token.tokenNumber}, SID: ${result.sid}`);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}
