import React, { useEffect, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { Badge } from '@/components/ui/badge';

const SocketStatus: React.FC = () => {
  const { isConnected } = useSocket();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  // Prevent hydration mismatch by not rendering until mounted on client
  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
        Socket: {isConnected ? "Connected" : "Disconnected"}
      </Badge>
    </div>
  );
};

export default SocketStatus;