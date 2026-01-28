import type { APIRoute } from 'astro';
import { connectToHost } from '../../lib/ssh';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const POST: APIRoute = async ({ request }) => {
    try {
        const rawBody = await request.text();
        if (!rawBody) throw new Error('Empty request body');

        const body = JSON.parse(rawBody);
        const { host, username, password, authType, keyName } = body;

        const config: any = { host, username };

        if (authType === 'key') {
            if (!keyName) throw new Error('Missing key name');
            const homeDir = os.homedir();
            const keyPath = path.join(homeDir, '.raspi-ui', 'keys', keyName);

            if (!fs.existsSync(keyPath)) {
                throw new Error(`Key not found: ${keyName}`);
            }
            config.privateKey = fs.readFileSync(keyPath);
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
