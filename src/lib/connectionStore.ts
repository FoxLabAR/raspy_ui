import { ref, readonly } from 'vue';

const isConnected = ref(false);

export const useConnection = () => {
    const setConnected = (status: boolean) => {
        isConnected.value = status;
    };

    const checkActiveSession = async () => {
        try {
            // "Silent" check
            const res = await fetch('/api/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'echo ping' })
            });

            if (res.ok) {
                // If 200 OK, we are connected (assuming api/exec returns 401/500 if not)
                setConnected(true);
                return true;
            } else {
                // If 401 or anything else, we are not connected
                setConnected(false);
                return false;
            }
        } catch (e) {
            setConnected(false);
            return false;
        }
    };

    const attemptAutoConnect = async () => {
        if (isConnected.value) return; // Already connected

        // First try to see if we already have a session
        const sessionActive = await checkActiveSession();
        if (sessionActive) return;

        try {
            // Fetch config from settings API
            const res = await fetch('/api/settings', {
                method: 'POST',
                body: JSON.stringify({ action: 'get_config' })
            });
            const data = await res.json();

            if (data.success && data.config?.defaultConnection?.autoConnect) {
                const conn = data.config.defaultConnection;
                if (!conn.host || !conn.username) return;

                console.log('Auto-connecting to', conn.host);

                // Use connect API
                const connectRes = await fetch('/api/connect', {
                    method: 'POST',
                    body: JSON.stringify({
                        host: conn.host,
                        username: conn.username,
                        authType: conn.authType,
                        keyPath: conn.authType === 'key' ? conn.keyPath : undefined,
                        keyName: conn.authType === 'key' ? conn.keyPath : undefined,
                        password: conn.authType === 'password' ? conn.password : undefined
                    })
                });

                const connectData = await connectRes.json();
                if (connectData.success) {
                    setConnected(true);
                    console.log('Auto-connection success');
                } else {
                    console.warn('Auto-connection failed:', connectData.error);
                }
            }
        } catch (e) {
            console.error('Auto-connect error', e);
        }
    };

    const disconnect = async () => {
        try {
            await fetch('/api/connect', { method: 'DELETE' });
            setConnected(false);
        } catch (e) {
            console.error('Disconnect failed', e);
            setConnected(false); // Assume disconnected anyway on error
        }
    };

    return {
        isConnected: readonly(isConnected),
        setConnected,
        attemptAutoConnect,
        checkActiveSession,
        disconnect
    };
};
