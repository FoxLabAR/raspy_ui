import { ref, readonly } from 'vue';

const isConnected = ref(false);

export const useConnection = () => {
    const setConnected = (status: boolean) => {
        isConnected.value = status;
    };

    return {
        isConnected: readonly(isConnected),
        setConnected
    };
};
