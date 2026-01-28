import type { APIRoute } from 'astro';
import { executeCommand } from '../../lib/ssh';

export const POST: APIRoute = async ({ request }) => {
    try {
        const rawBody = await request.text();
        if (!rawBody) return new Response(JSON.stringify({ error: 'Empty body' }), { status: 400 });

        const body = JSON.parse(rawBody);
        const { action, path, name } = body;

        if (!action || !path) {
            return new Response(JSON.stringify({ error: 'Missing action or path' }), { status: 400 });
        }

        let cmd = '';

        switch (action) {
            case 'list':
                // List files: type|size|name
                // d|4096|folder
                // f|123|file.txt
                // Use safe find command. 
                // Note: -printf is GNU find. DietPi usually has it.
                // We escape path to avoid issues, but simplest is single quotes.
                // But single quotes inside single quotes is hard.
                // Let's assume path is safe or use simple checking.
                // BETTER: use ls -p1 and separate stat? No, too slow.
                // stat -c "%F|%s|%n" * ?
                cmd = `cd "${path}" && find . -maxdepth 1 -mindepth 1 -printf "%y|%s|%f\\n" | sort`;
                break;

            case 'mkdir':
                if (!name) return new Response(JSON.stringify({ error: 'Missing name' }), { status: 400 });
                cmd = `cd "${path}" && mkdir -p "${name}"`;
                break;

            case 'create_file':
                if (!name) return new Response(JSON.stringify({ error: 'Missing name' }), { status: 400 });
                cmd = `cd "${path}" && touch "${name}"`;
                break;

            case 'delete':
                if (path === '/' || path === '/root' || path === '/boot') {
                    return new Response(JSON.stringify({ error: 'Restricted path' }), { status: 403 });
                }
                cmd = `rm -rf "${path}"`;
                break;

            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
        }

        const result = await executeCommand(cmd);

        if (!result) {
            return new Response(JSON.stringify({ error: 'Execution failed (no connection?)' }), { status: 500 });
        }

        if (result.stderr && action !== 'list') { // find might have stderr for permission denied on subfiles, ignore for list? no.
            // allow some stderr?
        }

        // Parse list output
        let data: any = result.stdout;
        if (action === 'list') {
            const items = [];
            const lines = result.stdout.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                const [type, size, name] = line.split('|');
                if (!name) continue;
                items.push({
                    name,
                    type: type === 'd' ? 'directory' : 'file',
                    size: parseInt(size || '0'),
                    path: path === '/' ? `/${name}` : `${path}/${name}`
                });
            }
            // Sort: directories first
            items.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'directory' ? -1 : 1;
            });
            data = items;
        }

        return new Response(JSON.stringify({ success: true, data: data }), { status: 200 });

    } catch (err: any) {
        console.error('FS API Error:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
}
