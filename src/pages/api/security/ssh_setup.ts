import type { APIRoute } from 'astro';
import { executeCommand, getClient } from '../../../lib/ssh';
import { generateKeyPair } from 'crypto';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const generateKeyPairAsync = promisify(generateKeyPair);

// Helper to manage SSH Config
const updateSSHConfig = (action: 'add' | 'remove', entry: { hostAlias: string, hostName?: string, user?: string, identityFile?: string }) => {
    const sshDir = path.join(os.homedir(), '.ssh');
    const configPath = path.join(sshDir, 'config');

    if (!fs.existsSync(sshDir)) fs.mkdirSync(sshDir, { recursive: true });
    if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, '');

    let content = fs.readFileSync(configPath, 'utf8');

    // Normalize line endings
    content = content.replace(/\r\n/g, '\n');

    if (action === 'remove') {
        // Regex to remove the block: Host alias... up to next Host or end
        // A simple approach: split by "Host ", filter out the one matching alias
        const blocks = content.split(/^Host /m);
        const newBlocks = blocks.filter(b => {
            if (!b.trim()) return true; // keep empty/preamble
            const currentAlias = b.split(/\s+/)[0].trim();
            return currentAlias !== entry.hostAlias;
        });
        // Reconstruct
        const newContent = newBlocks.join('Host ');
        // Fix potential double "Host Host" if first block was empty?
        // Actually split keeps the delimiter out. So we join with it.
        // Special case: if file started with comments/options before first Host.
        // It ends up in blocks[0].

        fs.writeFileSync(configPath, newContent);
    }

    if (action === 'add') {
        // Remove first to avoid duplicates
        updateSSHConfig('remove', { hostAlias: entry.hostAlias });

        // Read again/use current state (actually we just wrote file, so better read or append)
        // Let's append clean block
        const newBlock = `\nHost ${entry.hostAlias}\n  HostName ${entry.hostName}\n  User ${entry.user}\n  IdentityFile ${entry.identityFile}\n`;

        fs.appendFileSync(configPath, newBlock);
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const rawBody = await request.text();
        const body = JSON.parse(rawBody || '{}');
        const { action, keyName, host, username } = body;

        // Base dir for keys on HOST (PC)
        const homeDir = os.homedir();
        const keyDir = path.join(homeDir, '.raspi-ui', 'keys');

        if (!fs.existsSync(keyDir)) {
            fs.mkdirSync(keyDir, { recursive: true });
        }

        if (action === 'create_smart_key') {
            if (!keyName || !host || !username) {
                return new Response(JSON.stringify({ error: 'Missing required params (keyName, host, username)' }), { status: 400 });
            }

            // 1. Generate Key Pair
            // Using ssh-keygen for reliability and OpenSSH format
            const keyPath = path.join(keyDir, keyName);
            const pubPath = keyPath + '.pub';

            const cp = await import('child_process');
            const exec = promisify(cp.exec);

            try {
                if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
                if (fs.existsSync(pubPath)) fs.unlinkSync(pubPath);

                // Use absolute path for ssh-keygen file output to avoid CWD issues
                // Windows path handling might require quotes? yes.
                await exec(`ssh-keygen -t rsa -b 4096 -f "${keyPath}" -N "" -C "raspi-ui-${keyName}"`);
            } catch (e: any) {
                return new Response(JSON.stringify({ error: 'Key Gen Failed: ' + e.message }), { status: 500 });
            }

            const pubKeyContent = fs.readFileSync(pubPath, 'utf8');

            // 2. Install on Pi (Remote)
            const client = getClient();
            if (!client) {
                return new Response(JSON.stringify({ error: 'Not connected. Connect via password first.' }), { status: 400 });
            }

            const cmd = `
                mkdir -p ~/.ssh && 
                chmod 700 ~/.ssh && 
                echo "${pubKeyContent.trim()}" >> ~/.ssh/authorized_keys && 
                chmod 600 ~/.ssh/authorized_keys
            `;

            const result = await executeCommand(cmd);
            if (!result) return new Response(JSON.stringify({ error: 'Failed to install key on Pi' }), { status: 500 });

            // 3. Update Local Config
            try {
                updateSSHConfig('add', {
                    hostAlias: keyName,
                    hostName: host,
                    user: username,
                    identityFile: keyPath // Windows path? SSH config on Windows supports standard paths, usually forward slashes preferred but backslashes work in quotes?
                    // Actually OpenSSH on Windows often wants forward slashes.
                });
            } catch (e: any) {
                return new Response(JSON.stringify({ error: 'Config Update Failed: ' + e.message }), { status: 500 });
            }

            return new Response(JSON.stringify({ success: true, keyPath }), { status: 200 });
        }

        if (action === 'delete_key') {
            if (!keyName) return new Response(JSON.stringify({ error: 'Missing keyName' }), { status: 400 });

            const keyPath = path.join(keyDir, keyName);
            if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
            if (fs.existsSync(keyPath + '.pub')) fs.unlinkSync(keyPath + '.pub');

            updateSSHConfig('remove', { hostAlias: keyName });

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (action === 'list_keys') {
            // List keys in keyDir
            if (fs.existsSync(keyDir)) {
                const files = fs.readdirSync(keyDir).filter(f => !f.endsWith('.pub'));
                // Check if they are in config?
                const sshConfigPath = path.join(os.homedir(), '.ssh', 'config');
                let configContent = '';
                if (fs.existsSync(sshConfigPath)) configContent = fs.readFileSync(sshConfigPath, 'utf8');

                const keys = files.map(f => {
                    return {
                        name: f,
                        path: path.join(keyDir, f),
                        isConfigured: configContent.includes(`Host ${f}`)
                    };
                });
                return new Response(JSON.stringify({ keys }), { status: 200 });
            } else {
                return new Response(JSON.stringify({ keys: [] }), { status: 200 });
            }
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
}
