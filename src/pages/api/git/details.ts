import type { APIRoute } from 'astro';
import { executeCommand } from '../../../lib/ssh';

export const POST: APIRoute = async ({ request }) => {
    try {
        const rawBody = await request.text();
        if (!rawBody) return new Response(JSON.stringify({ error: 'Empty body' }), { status: 400 });

        const body = JSON.parse(rawBody);
        const { path, action, hookName, hookContent } = body;

        if (!path) return new Response(JSON.stringify({ error: 'Missing path' }), { status: 400 });

        if (action === 'get_details') {
            const cmd = `
                cd "${path}" && 
                echo "---COMMITS---" &&
                git log -n 10 --pretty=format:"%h|%an|%ar|%s" &&
                echo "" &&
                echo "---BRANCHES---" &&
                git branch -a &&
                echo "---HOOKS---" &&
                ls -1 hooks/
            `;

            const result = await executeCommand(cmd);
            if (!result) return new Response(JSON.stringify({ error: 'Command failed' }), { status: 500 });

            // Parse output
            const lines = result.stdout.split('\n');
            let section = '';
            const commits = [];
            const branches = [];
            const hooks = [];

            for (const line of lines) {
                if (line === '---COMMITS---') { section = 'commits'; continue; }
                if (line === '---BRANCHES---') { section = 'branches'; continue; }
                if (line === '---HOOKS---') { section = 'hooks'; continue; }

                if (!line.trim()) continue;

                if (section === 'commits') {
                    const [hash, author, time, msg] = line.split('|');
                    commits.push({ hash, author, time, msg });
                }
                if (section === 'branches') {
                    branches.push(line.trim());
                }
                if (section === 'hooks') {
                    hooks.push(line.trim());
                }
            }

            return new Response(JSON.stringify({
                success: true,
                data: { commits, branches, hooks }
            }), { status: 200 });
        }

        if (action === 'get_hook') {
            if (!hookName) return new Response(JSON.stringify({ error: 'Missing hook name' }), { status: 400 });
            const cmd = `cat "${path}/hooks/${hookName}"`;
            const result = await executeCommand(cmd);
            // If hook doesn't exist or is empty, return empty string but success
            return new Response(JSON.stringify({
                success: true,
                content: result ? result.stdout : ''
            }), { status: 200 });
        }

        if (action === 'save_hook') {
            if (!hookName) return new Response(JSON.stringify({ error: 'Missing hook name' }), { status: 400 });
            // Use simple echo for now, but be careful with quotes. 
            // Ideally we write to a temp file and move it.
            // For simplicity in this env: wrapper via printf %s might be safer, but let's assume basic text content.
            // We'll escape double quotes.
            const safeContent = (hookContent || '').replace(/"/g, '\\"');
            const cmd = `echo "${safeContent}" > "${path}/hooks/${hookName}" && chmod +x "${path}/hooks/${hookName}"`;

            const result = await executeCommand(cmd);
            return new Response(JSON.stringify({ success: !!result }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
}
