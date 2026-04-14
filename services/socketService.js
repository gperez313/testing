import { Server } from 'socket.io';

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join rooms based on userId or role
    socket.on('join', (room) => {
      console.log(`Socket ${socket.id} joining room: ${room}`);
      socket.join(room);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Handle driver location updates
    socket.on('driver:location:update', (data) => {
      const { driverId, orderId, coords } = data;
      if (orderId) {
        // Notify the specific order room (customer)
        io.to(`order_${orderId}`).emit('driver:location', { driverId, coords });
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

/**
 * Notify a specific user
 */
export const notifyUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

/**
 * Notify all drivers
 */
export const notifyDrivers = (event, data) => {
  if (io) {
    io.to('drivers').emit(event, data);
  }
};

/**
 * Notify a specific order room
 */
export const notifyOrder = (orderId, event, data) => {
  if (io) {
    io.to(`order_${orderId}`).emit(event, data);
  }
};
