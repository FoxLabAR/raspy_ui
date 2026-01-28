import type { APIRoute } from 'astro';
import { executeCommand } from '../../lib/ssh';

// We store config in /home/dietpi/.raspi-ui/config.json
const CONFIG_PATH = '~/.raspi-ui/config.json';
const SSH_KEY_PATH = '~/.ssh/id_rsa.pub';

export const POST: APIRoute = async ({ request }) => {
    try {
        const rawBody = await request.text();
        if (!rawBody) return new Response(JSON.stringify({ error: 'Empty body' }), { status: 400 });

        const body = JSON.parse(rawBody);
        const { action, password, config } = body;

        // Ensure config dir exists
        await executeCommand(`mkdir -p ~/.raspi-ui`);

        if (action === 'get_config') {
            const result = await executeCommand(`cat ${CONFIG_PATH} || echo "{}"`);
            const conf = JSON.parse(result && result.stdout ? result.stdout : '{}');
            // Sanitize: do not send full hashed password back? Or maybe we don't send it at all.
            // Client just needs to know if master password is set.
            const hasMasterPass = !!conf.masterHash;
            delete conf.masterHash;

            return new Response(JSON.stringify({
                success: true,
                config: conf,
                hasMasterPass
            }), { status: 200 });
        }

        if (action === 'save_config') {
            // We need current config to preserve hash if not changing
            const currRes = await executeCommand(`cat ${CONFIG_PATH} || echo "{}"`);
            const currConf = JSON.parse(currRes && currRes.stdout ? currRes.stdout : '{}');

            const newConf = { ...currConf, ...config };
            // If password provided, hash it (simple server-side hash for now, actually we rely on client sending plaintext and we hash here? No, let's keep it simple: store hash).
            // Since we are running on Node adapter, crypto is available.

            // ... actually, we just write what client gives for config, but password should be handled separately?
            // Let's assume 'config' object contains settings. 
            // Master password setting is separate action.

            const json = JSON.stringify(newConf, null, 2).replace(/"/g, '\\"');
            await executeCommand(`echo "${json}" > ${CONFIG_PATH}`);

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (action === 'verify_master') {
            const result = await executeCommand(`cat ${CONFIG_PATH} || echo "{}"`);
            const conf = JSON.parse(result && result.stdout ? result.stdout : '{}');

            // Simple comparison for now. Ideally use bcrypt if possible on the Pi? 
            // Or hash locally on Node adapter.
            // Since we don't want to install bcrypt on Pi, we can do it here in the Node adapter if we trust the SSH connection security.
            // Wait, the Node adapter runs on the USER's machine (dev mode) or the Pi (prod)?
            // The user says "The user's OS version is windows". 
            // So Node is running on Windows.
            // So we can use crypto here.

            // But we need to see what is stored.
            // If stored is a hash, we hash the input and compare.

            // Let's assume we store the hash (SHA256).
            // But for now, let's just store plaintext for simplicity of MVP or simple hash?
            // User asked for "contraseña maestra".
            // Let's use simple string match for MVP but warn about it.
            // OR use crypto to hash.

            const crypto = await import('crypto');
            const hash = crypto.createHash('sha256').update(password || '').digest('hex');

            if (conf.masterHash === hash) {
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            } else {
                return new Response(JSON.stringify({ success: false, error: 'Invalid Password' }), { status: 401 });
            }
        }

        if (action === 'set_master') {
            const crypto = await import('crypto');
            const hash = crypto.createHash('sha256').update(password || '').digest('hex');

            const currRes = await executeCommand(`cat ${CONFIG_PATH} || echo "{}"`);
            const currConf = JSON.parse(currRes && currRes.stdout ? currRes.stdout : '{}');

            currConf.masterHash = hash;

            const json = JSON.stringify(currConf, null, 2).replace(/"/g, '\\"');
            await executeCommand(`echo "${json}" > ${CONFIG_PATH}`);

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (action === 'get_ssh_key') {
            const result = await executeCommand(`cat ${SSH_KEY_PATH} || echo "NO_KEY"`);
            return new Response(JSON.stringify({
                success: true,
                key: result ? result.stdout : ''
            }), { status: 200 });
        }

        if (action === 'gen_ssh_key') {
            // Generate if not exists
            await executeCommand(`[ ! -f ~/.ssh/id_rsa ] && ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""`);
            const result = await executeCommand(`cat ${SSH_KEY_PATH}`);
            return new Response(JSON.stringify({
                success: true,
                key: result ? result.stdout : ''
            }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
}
