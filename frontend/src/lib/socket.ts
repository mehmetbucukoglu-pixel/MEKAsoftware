import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (clinicId: string, userId: string, role: string) => {
    if (!socket) {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        socket = io(backendUrl, {
            query: { clinicId, userId, role },
        });

        socket.on('connect', () => {
            console.log('Connected to WebSocket');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
