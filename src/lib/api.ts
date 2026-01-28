import { useTerminal } from './terminalStore';
import { useConnection } from './connectionStore';

export const sendCommand = async (command: string, silent = false) => {
    const { addLog } = useTerminal();
    const { setConnected } = useConnection();

    if (!silent) addLog(`${command}`, 'command');

    try {
        const res = await fetch('/api/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });

        // Debug: Read as text first to handle non-JSON failures (500/404 HTML)
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            // Probably an HTML error page or empty response
            if (!silent) addLog(`API Parse Error: ${text.substring(0, 150)}...`, 'error');
            return null;
        }

        if (!res.ok) {
            if (res.status === 401) {
                setConnected(false);
            }
            if (!silent) addLog(`Error: ${data.error}`, 'error');
            return null;
        }

        // Implicitly connected if success
        setConnected(true);

        if (!silent) {
            if (data.stdout) addLog(data.stdout, 'ssh_out');
            if (data.stderr) addLog(data.stderr, 'ssh_err');
        }

        return data;
    } catch (e: any) {
        if (!silent) addLog(`System Error: ${e.message}`, 'error');
        return null;
    }
}

export const connectSSH = async (creds: any) => {
    const { addLog } = useTerminal();
    const { setConnected } = useConnection();

    addLog(`Connecting to ${creds.host}...`, 'info');

    try {
        const res = await fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            addLog(`API Parse Error (Connect): ${text.substring(0, 150)}...`, 'error');
            return { success: false, error: 'Invalid Server Response' };
        }

        if (data.success) {
            addLog('Connection established successfully.', 'success');
            setConnected(true);
            return { success: true };
        } else {
            addLog(`Connection failed (Server): ${data.error}`, 'error');
            setConnected(false);
            return { success: false, error: data.error };
        }
    } catch (e: any) {
        addLog(`Connection Error (Network): ${e.message}`, 'error');
        setConnected(false);
        return { success: false, error: e.message };
    }
}
