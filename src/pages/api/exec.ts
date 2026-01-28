import type { APIRoute } from 'astro';
import { executeCommand, isConnected } from '../../lib/ssh';

export const POST: APIRoute = async ({ request }) => {
    if (!isConnected()) {
        return new Response(JSON.stringify({ error: 'Not connected. Please login first.' }), { status: 401 });
    }

    try {
        const body = await request.json();
        const { command } = body;

        if (!command) {
            return new Response(JSON.stringify({ error: 'No command provided' }), { status: 400 });
        }

        const result = await executeCommand(command);
        return new Response(JSON.stringify(result), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
