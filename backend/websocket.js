// File: backend/websocket.js

const { WebSocketServer } = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken'); // Pastikan Anda sudah menginstal 'jsonwebtoken'

// Peta untuk menyimpan koneksi WebSocket yang aktif.
const clients = new Map(); // Key: userId, Value: { ws: WebSocket, role: string }

let wss;

/**
 * Menginisialisasi server WebSocket dan menempelkannya ke server HTTP yang ada.
 * @param {http.Server} server - Instance server HTTP dari aplikasi Express Anda.
 */
function initializeWebSocket(server) {
    wss = new WebSocketServer({ noServer: true });

    // Listener untuk event 'upgrade' dari server HTTP
    server.on('upgrade', (request, socket, head) => {
        const { pathname } = url.parse(request.url);

        // Hanya tangani permintaan upgrade WebSocket
        if (pathname === '/') {
            authenticate(request, (err, clientData) => {
                if (err || !clientData) {
                    // Jika autentikasi gagal, tolak koneksi
                    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                    socket.destroy();
                    return;
                }

                wss.handleUpgrade(request, socket, head, (ws) => {
                    wss.emit('connection', ws, request, clientData);
                });
            });
        } else {
            socket.destroy();
        }
    });

    // Listener untuk koneksi baru yang berhasil di-upgrade
    wss.on('connection', (ws, request, clientData) => {
        const { userId, role } = clientData; // Ambil role juga

        // Simpan koneksi klien yang aktif
        clients.set(userId, { ws, role });
        console.log(`WebSocket Client connected: User ID ${userId}, Role: ${role}`);

        // Hapus klien dari peta saat koneksi ditutup
        ws.on('close', () => {
            clients.delete(userId);
            console.log(`WebSocket Client disconnected: User ID ${userId}`);
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error for User ID ${userId}:`, error);
        });
    });

    console.log('WebSocket server is initialized.');
}

/**
 * Mengautentikasi koneksi WebSocket menggunakan token dari query string.
 * @param {http.IncomingMessage} request - Permintaan upgrade.
 * @param {Function} callback - Callback dengan hasil autentikasi.
 */
function authenticate(request, callback) {
    const token = url.parse(request.url, true).query.token;

    if (!token) {
        return callback(new Error('No token provided'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return callback(new Error('Invalid token'));
        }
        // Token valid, kembalikan data pengguna (payload)
        callback(null, decoded);
    });
}

/**
 * Mengirim pesan ke pengguna tertentu jika mereka terhubung.
 * @param {number} userId - ID pengguna yang akan dikirimi pesan.
 * @param {object} message - Objek pesan yang akan dikirim (akan di-stringify).
 */
function sendMessageToUser(userId, message) {
    const client = clients.get(userId);
    if (client && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(JSON.stringify(message));
        console.log(`Sent message to User ID ${userId}:`, message);
        return true;
    }
    console.log(`User ID ${userId} is not connected. Message not sent.`);
    return false;
}

/**
 * Mengirim pesan ke semua admin/superadmin yang terhubung.
 * @param {object} message - Objek pesan yang akan dikirim.
 */
function broadcastToAdmins(message) {
    const adminRoles = ['admin', 'superadmin'];
    let sentCount = 0;
    clients.forEach((client, userId) => {
        if (adminRoles.includes(client.role) && client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify(message));
            sentCount++;
        }
    });
    if (sentCount > 0) {
        console.log(`Broadcasted message to ${sentCount} admin(s):`, message);
    }
}

module.exports = {
    initializeWebSocket,
    sendMessageToUser,
    broadcastToAdmins
};
