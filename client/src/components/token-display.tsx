import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Send } from 'lucide-react';
import { Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TokenDisplayProps {
  token: {
    tokenNumber: string;
    departmentCode: string;
    issuedAt: string;
    estimatedWait: number;
  };
  patient: {
    name: string;
  };
  department: {
    name: string;
  };
  onNewToken: () => void;
}

const TokenDisplay: React.FC<TokenDisplayProps> = ({ token, patient, department, onNewToken }) => {
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Format the date for display
  const formattedDate = format(new Date(token.issuedAt), 'MMMM d, yyyy - h:mm a');
  
  // Format wait time in minutes to a readable string
  const formatWaitTime = (minutes: number) => {
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
  };
  
  // Handle print token
  const handlePrint = () => {
    setIsPrinting(true);
    
    // Create print content
    const printContent = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>RGCIRC Queue Management</h2>
        <p>Patient: ${patient.name}</p>
        <div style="border: 2px dashed #0f766e; padding: 15px; margin: 15px 0;">
          <p style="color: #0f766e; margin: 0;">Department</p>
          <p style="font-weight: bold; font-size: 16px; margin: 5px 0;">${department.name}</p>
          <div style="margin: 15px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #0f766e;">${token.tokenNumber}</span>
          </div>
          <p style="color: #666; margin: 0; font-size: 12px;">${formattedDate}</p>
        </div>
        <p>Estimated wait: ${formatWaitTime(token.estimatedWait)}</p>
        <p style="font-size: 12px; margin-top: 20px;">Thank you for choosing RGCIRC</p>
      </div>
    `;
    
    // Create a hidden iframe for printing
    const printIframe = document.createElement('iframe');
    printIframe.style.display = 'none';
    document.body.appendChild(printIframe);
    
    printIframe.contentDocument!.write(printContent);
    printIframe.contentDocument!.close();
    
    setTimeout(() => {
      printIframe.contentWindow!.print();
      document.body.removeChild(printIframe);
      setIsPrinting(false);
    }, 500);
  };
  
  // Handle send via WhatsApp
  const handleSendWhatsApp = () => {
    setIsSending(true);
    
    // The WhatsApp message is actually sent from the server when the token is created
    // This is just to provide feedback to the user that their WhatsApp notification has been sent
    
    setTimeout(() => {
      toast({
        title: "WhatsApp Notification Sent",
        description: "The token details have been sent to the patient's WhatsApp.",
      });
      setIsSending(false);
    }, 1000);
  };
  
  return (
    <div className="text-center">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Token Generated Successfully</h3>
      <div className="mt-6 mb-6">
        <div className="inline-block bg-teal-50 dark:bg-teal-900/30 p-6 rounded-lg border-2 border-dashed border-teal-200 dark:border-teal-700">
          <p className="text-sm text-teal-700 dark:text-teal-300">Department</p>
          <p className="text-xl font-bold text-teal-800 dark:text-teal-200">{department.name}</p>
          <div className="my-4">
            <span className="text-5xl font-bold text-teal-700 dark:text-teal-400">{token.tokenNumber}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</p>
        </div>
      </div>
      
      <div className="mb-6 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-md">
        <div className="flex items-center justify-center">
          <Clock className="h-5 w-5 text-amber-500 mr-2" />
          <p className="text-amber-800 dark:text-amber-300">
            Estimated wait time: <span className="font-semibold">{formatWaitTime(token.estimatedWait)}</span>
          </p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          variant="default" 
          className="flex-1 bg-teal-600 hover:bg-teal-700"
          onClick={handlePrint}
          disabled={isPrinting}
        >
          <Printer className="mr-2 h-4 w-4" /> {isPrinting ? 'Printing...' : 'Print Token'}
        </Button>
        <Button 
          variant="default" 
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={handleSendWhatsApp}
          disabled={isSending}
        >
          <Send className="mr-2 h-4 w-4" /> {isSending ? 'Sending...' : 'Send via WhatsApp'}
        </Button>
      </div>
      
      <Button
        variant="link"
        className="mt-4 text-sm text-teal-600 dark:text-teal-400 hover:underline"
        onClick={onNewToken}
      >
        Generate New Token
      </Button>
    </div>
  );
};

export default TokenDisplay;
