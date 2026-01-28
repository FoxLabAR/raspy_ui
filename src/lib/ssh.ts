
import { Client } from 'ssh2';

let sshClient: Client | null = null;

export const isConnected = () => !!sshClient;

export const getClient = () => sshClient;

export const connectToHost = (config: any) => {
    return new Promise((resolve, reject) => {
        // Disconnect existing if any
        if (sshClient) {
            sshClient.end();
            sshClient = null;
        }

        const conn = new Client();
        conn.on('ready', () => {
            sshClient = conn;
            console.log('SSH Connection Established: ' + config.host);
            resolve({ success: true, message: 'Connected to ' + config.host });
        }).on('error', (err) => {
            console.error('SSH Connection Detailed Error:', err);
            reject({ success: false, message: err.message, stack: err.stack });
        }).on('end', () => {
            console.log('SSH Connection Ended');
            sshClient = null;
        }).connect({
            ...config,
            keepaliveInterval: 10000,
            readyTimeout: 20000,
            algorithms: {
                serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519'],
                cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-cbc', '3des-cbc'],
                hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
            }
        });
    });
};

export const executeCommand = (command: string): Promise<{ stdout: string, stderr: string, code: number }> => {
    return new Promise((resolve, reject) => {
        if (!sshClient) {
            return reject(new Error('NOT_CONNECTED'));
        }

        sshClient.exec(command, (err, stream) => {
            if (err) return reject(err);

            let stdout = '';
            let stderr = '';

            stream.on('close', (code: number, signal: any) => {
                resolve({ stdout, stderr, code });
            }).on('data', (data: any) => {
                stdout += data.toString();
            }).stderr.on('data', (data: any) => {
                stderr += data.toString();
            });
        });
    });
};
