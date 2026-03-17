import type { APIRoute } from 'astro';
import { connectToHost, closeConnection } from '../../lib/ssh';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const POST: APIRoute = async ({ request }) => {
    try {
        const rawBody = await request.text();
        if (!rawBody) throw new Error('Empty request body');

        const body = JSON.parse(rawBody);
        const { host, username, password, authType, keyName, action } = body;

        // Support "disconnect" action via POST
        if (action === 'disconnect') {
            closeConnection();
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        const config: any = { host, username };

        if (authType === 'key') {
            const homeDir = os.homedir();
            let finalKeyPath = '';

            // logic to determine if we have a path or a name
            const explicitPath = body.keyPath;
            const explicitName = body.keyName;

            // Helper to check if string looks like a path
            const isLikePath = (p: string) => p.includes('/') || p.includes('\\') || p.startsWith('~/');

            if (explicitPath && isLikePath(explicitPath)) {
                // Assert it as a path
                finalKeyPath = explicitPath;
            } else if (explicitName) {
                // Assert it as a name
                finalKeyPath = path.join(homeDir, '.raspi-ui', 'keys', explicitName);
            } else if (explicitPath) {
                // Ambiguous: provided in keyPath but look like a name?
                // Try treating as managed key if no slashes
                finalKeyPath = path.join(homeDir, '.raspi-ui', 'keys', explicitPath);
            } else {
                throw new Error('Missing key name or path');
            }

            // Expand ~ if present
            if (finalKeyPath.startsWith('~/')) {
                finalKeyPath = path.join(homeDir, finalKeyPath.substring(2));
            }

            if (!fs.existsSync(finalKeyPath)) {
                // If we tried as managed key and failed, maybe it WAS a relative path?
                // But we generally expect absolute paths.
                throw new Error(`Key not found: ${finalKeyPath}`);
            }
            config.privateKey = fs.readFileSync(finalKeyPath);
        } else {
            if (!password) {
                return new Response(JSON.stringify({ success: false, error: 'Missing password' }), { status: 400 });
            }
            config.password = password;
        }

        await connectToHost(config);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message || 'Connection failed' }), { status: 500 });
    }
}

export const DELETE: APIRoute = async () => {
    try {
        closeConnection();
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
}
