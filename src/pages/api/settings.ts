import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
// We don't use executeCommand for local config anymore

const HOME_DIR = os.homedir();
const CONFIG_DIR = path.join(HOME_DIR, '.raspi-ui');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SSH_DIR = path.join(HOME_DIR, '.ssh');
const PUB_KEY_PATH = path.join(SSH_DIR, 'id_rsa.pub');

const ensureConfigDir = () => {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
};

const getLocalConfig = () => {
    ensureConfigDir();
    if (!fs.existsSync(CONFIG_FILE)) {
        return {};
    }
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
};

const saveLocalConfig = (newConf: any) => {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConf, null, 2));
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const rawBody = await request.text();
        if (!rawBody) return new Response(JSON.stringify({ error: 'Empty body' }), { status: 400 });

        const body = JSON.parse(rawBody);
        const { action, password, config } = body;

        if (action === 'get_config') {
            const conf = getLocalConfig();
            const hasMasterPass = !!conf.masterHash;
            // Never send hash to client
            delete conf.masterHash;

            return new Response(JSON.stringify({
                success: true,
                config: conf,
                hasMasterPass
            }), { status: 200 });
        }

        if (action === 'save_config') {
            const currConf = getLocalConfig();
            // Merge deep? For now shallow merge of top keys is fine based on usage
            const newConf = { ...currConf, ...config };

            // If masterHash was present in currConf, it's preserved unless config overwrites it (which it shouldn't)
            saveLocalConfig(newConf);

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (action === 'verify_master') {
            const conf = getLocalConfig();
            const hash = crypto.createHash('sha256').update(password || '').digest('hex');

            if (conf.masterHash === hash) {
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            } else {
                return new Response(JSON.stringify({ success: false, error: 'Invalid Password' }), { status: 401 });
            }
        }

        if (action === 'set_master') {
            const hash = crypto.createHash('sha256').update(password || '').digest('hex');
            const currConf = getLocalConfig();
            currConf.masterHash = hash;
            saveLocalConfig(currConf);

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (action === 'get_ssh_key') {
            if (fs.existsSync(PUB_KEY_PATH)) {
                return new Response(JSON.stringify({
                    success: true,
                    key: fs.readFileSync(PUB_KEY_PATH, 'utf-8')
                }), { status: 200 });
            } else {
                return new Response(JSON.stringify({ success: true, key: '' }), { status: 200 });
            }
        }

        if (action === 'gen_ssh_key') {
            // This needs to actually generate a key on the HOST machine (User's PC)
            if (!fs.existsSync(PUB_KEY_PATH)) {
                // We need to use child_process to run ssh-keygen locally
                const { exec } = await import('child_process');
                const util = await import('util');
                const execAsync = util.promisify(exec);

                const keyPath = path.join(SSH_DIR, 'id_rsa');
                // Ensure .ssh dir exists
                if (!fs.existsSync(SSH_DIR)) fs.mkdirSync(SSH_DIR, { recursive: true });

                // Generate key
                await execAsync(`ssh-keygen -t rsa -b 4096 -f "${keyPath}" -N ""`);
            }

            return new Response(JSON.stringify({
                success: true,
                key: fs.readFileSync(PUB_KEY_PATH, 'utf-8')
            }), { status: 200 });
        }

        if (action === 'verify_key_path') {
            const { path: keyPath } = body;
            let finalPath = keyPath;
            if (finalPath.startsWith('~/')) {
                finalPath = path.join(HOME_DIR, finalPath.substring(2));
            }

            if (fs.existsSync(finalPath)) {
                return new Response(JSON.stringify({ success: true, verifiedPath: finalPath }), { status: 200 });
            } else {
                return new Response(JSON.stringify({ success: false, error: 'File not found' }), { status: 400 });
            }
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
}
