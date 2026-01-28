import { ref, computed } from 'vue';

const isAuthenticated = ref(false);
const lastActivity = ref(Date.now());
const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

let timer: any = null;

const checkActivity = () => {
    if (Date.now() - lastActivity.value > TIMEOUT_MS) {
        logout();
    }
};

const startTimer = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(checkActivity, 60000); // Check every minute
};

const recordActivity = () => {
    lastActivity.value = Date.now();
};

const login = () => {
    isAuthenticated.value = true;
    lastActivity.value = Date.now();
    startTimer();
    // Add global event listeners for activity
    window.addEventListener('mousemove', recordActivity);
    window.addEventListener('keypress', recordActivity);
    window.addEventListener('click', recordActivity);
};

const logout = () => {
    isAuthenticated.value = false;
    if (timer) clearInterval(timer);
    timer = null;
    window.removeEventListener('mousemove', recordActivity);
    window.removeEventListener('keypress', recordActivity);
    window.removeEventListener('click', recordActivity);
};

export const useSecurity = () => {
    return {
        isAuthenticated: computed(() => isAuthenticated.value),
        login,
        logout,
        recordActivity
    };
};
