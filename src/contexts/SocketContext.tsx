import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGetAuthUserQuery, api } from '@/state/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useDispatch } from 'react-redux';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  data?: any;
  timestamp: string;
  read?: boolean;
}

interface SocketProviderProps {
  children: ReactNode;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { data: authUser } = useGetAuthUserQuery();
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false); // Track if connection is in progress

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const connectSocket = useCallback(async () => {
    // Don't reconnect if already connected
    if (socketRef.current?.connected) {
      console.log('🔌 Socket already connected, skipping reconnection');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('🔌 Connection already in progress, skipping');
      return;
    }

    // Check if socket exists and is not fully disconnected
    if (socketRef.current && !socketRef.current.disconnected) {
      console.log('🔌 Socket exists and not disconnected, skipping');
      return;
    }

    isConnectingRef.current = true;

    try {
      // Get the authentication token
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        console.error('No authentication token available');
        isConnectingRef.current = false;
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      
      // Clean up any disconnected socket
      if (socketRef.current && socketRef.current.disconnected) {
        console.log('🔌 Cleaning up disconnected socket');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      console.log('🔌 Creating new socket connection to:', serverUrl);
      const newSocket = io(serverUrl, {
        auth: {
          token: idToken,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: Infinity, // Keep trying to reconnect
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('✅ Socket connected to server');
        setIsConnected(true);
        isConnectingRef.current = false; // Reset connecting flag
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected from server. Reason:', reason);
        setIsConnected(false);
        isConnectingRef.current = false; // Reset connecting flag
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        console.error('Make sure the server is running on:', serverUrl);
        setIsConnected(false);
        isConnectingRef.current = false; // Reset connecting flag
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        isConnectingRef.current = false; // Reset connecting flag
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('Socket reconnection failed:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed permanently. Please check if server is running.');
        setIsConnected(false);
        isConnectingRef.current = false; // Reset connecting flag
      });

      // Tour event listeners - only for cache invalidation, notifications handled by notification:new
      newSocket.on('tour:scheduled', (data) => {
        console.log('Tour scheduled:', data);
        // Invalidate applications cache to refresh the UI
        dispatch(api.util.invalidateTags(['Applications']));
      });

      newSocket.on('tour:accepted', (data) => {
        console.log('Tour accepted:', data);
        // Notification handled by notification:new event
      });

      newSocket.on('tour:rescheduled', (data) => {
        console.log('Tour rescheduled:', data);
        // Notification handled by notification:new event
      });

      newSocket.on('tour:completed', (data) => {
        console.log('Tour completed:', data);
        // Invalidate applications cache to refresh the UI
        dispatch(api.util.invalidateTags(['Applications']));
      });

      newSocket.on('tour:cancelled', (data) => {
        console.log('Tour cancelled:', data);
        // Invalidate applications cache to refresh the UI
        dispatch(api.util.invalidateTags(['Applications']));
      });

      newSocket.on('tour:updated', (data) => {
        console.log('Tour updated:', data);
        // Invalidate applications cache to refresh the UI
        dispatch(api.util.invalidateTags(['Applications']));
      });

      // Application event listeners
      newSocket.on('application:status_updated', (data) => {
        console.log('Application status updated:', data);
        // Invalidate applications cache to refresh the UI
        dispatch(api.util.invalidateTags(['Applications']));
      });

      // Termination request event listeners
      newSocket.on('termination:requested', (data) => {
        console.log('Termination request created:', data);
        // Invalidate leases and properties cache to refresh the UI
        dispatch(api.util.invalidateTags(['Leases', 'Properties']));
      });

      newSocket.on('termination:responded', (data) => {
        console.log('Termination request responded:', data);
        // Invalidate leases and properties cache to refresh the UI
        dispatch(api.util.invalidateTags(['Leases', 'Properties']));
      });

      // General notification listener
      newSocket.on('notification:new', (notification) => {
        console.log('New notification received:', notification);
        addNotification({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: notification.type,
          message: notification.message || 'New notification',
          data: notification.data,
          timestamp: notification.timestamp || new Date().toISOString(),
        });
      });

      // Chat event listeners (for future implementation)
      newSocket.on('chat:new_message', (data) => {
        console.log('New chat message:', data);
        addNotification({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'chat:new_message',
          message: 'New message received',
          data,
          timestamp: new Date().toISOString(),
        });
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

    } catch (error) {
      console.error('Error connecting to socket:', error);
      console.error('Please ensure:');
      console.error('1. The server is running on the correct port');
      console.error('2. The server has Socket.io configured');
      console.error('3. CORS is properly configured on the server');
      isConnectingRef.current = false; // Reset connecting flag on error
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, [addNotification, dispatch]);

  // Initialize socket connection once when user is authenticated
  useEffect(() => {
    const initSocket = async () => {
      if (!authUser?.cognitoInfo?.userId) {
        // User not authenticated, cleanup any existing connection
        if (socketRef.current) {
          console.log('🔌 User logged out, disconnecting socket');
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
          setSocket(null);
          setIsConnected(false);
        }
        return;
      }

      // User is authenticated, connect if not already connected
      if (!socketRef.current || !socketRef.current.connected) {
        console.log('🔌 User authenticated, initializing socket connection');
        await connectSocket();
      } else {
        console.log('🔌 Socket already exists and connected, reusing connection');
      }
    };

    initSocket();

    // NO cleanup function - we want the socket to persist across route changes
    // Socket will only be cleaned up when user logs out or app closes
  }, [authUser?.cognitoInfo?.userId]); // Only depend on userId, NOT connectSocket
  
  // Final cleanup only when provider unmounts (app closes)
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('🔌 SocketProvider unmounting - disconnecting socket');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Socket utility methods
  const joinApplicationRoom = (applicationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:join_room', { applicationId });
    }
  };

  const sendChatMessage = (applicationId: string, message: string) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:message', { applicationId, message });
    }
  };

  // Extend the context value with utility methods
  const contextValue: SocketContextType & {
    joinApplicationRoom: (applicationId: string) => void;
    sendChatMessage: (applicationId: string, message: string) => void;
  } = {
    socket,
    isConnected,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    joinApplicationRoom,
    sendChatMessage,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Custom hooks for specific socket operations
export const useTourEvents = () => {
  const { socket } = useSocket();

  const scheduleTour = (applicationId: string, scheduledDate: string, landlordNotes?: string) => {
    if (socket) {
      socket.emit('tour:schedule', { applicationId, scheduledDate, landlordNotes });
    }
  };

  const acceptTour = (applicationId: string, tourId: string, tenantNotes?: string) => {
    if (socket) {
      socket.emit('tour:accept', { applicationId, tourId, tenantNotes });
    }
  };

  const rescheduleTour = (applicationId: string, tourId: string, newScheduledDate: string, notes?: string) => {
    if (socket) {
      socket.emit('tour:reschedule', { applicationId, tourId, newScheduledDate, notes });
    }
  };

  const completeTour = (applicationId: string, tourId: string, feedback?: string, rating?: number) => {
    if (socket) {
      socket.emit('tour:complete', { applicationId, tourId, feedback, rating });
    }
  };

  const cancelTour = (applicationId: string, tourId: string, reason?: string) => {
    if (socket) {
      socket.emit('tour:cancel', { applicationId, tourId, reason });
    }
  };

  return {
    scheduleTour,
    acceptTour,
    rescheduleTour,
    completeTour,
    cancelTour,
  };
};

export default SocketContext;