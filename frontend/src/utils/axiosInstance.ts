import axios from 'axios'


const getBackendURL = (): string => {
    const url = import.meta.env.VITE_BACKEND_URL?.trim();

    if (!url) {
        throw new Error(
            'VITE_BACKEND_URL is not configured. Set it in .env.local or .env.production'
        )
    }
    return url;
}

const axiosInstance = axios.create({
    baseURL: getBackendURL(),
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
})

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken')

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const requestUrl = error.config?.url || '';
            const isAuthEndpoint =
                requestUrl.includes('/users/login') ||
                requestUrl.includes('/users/register') ||
                requestUrl.includes('/users/verify-email') ||
                requestUrl.includes('/users/auth/');

            if (!isAuthEndpoint) {
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                const isAlreadyAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
                if (!isAlreadyAuthPage) {
                    const returnTo = `${window.location.pathname}${window.location.search}`
                    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`
                }
            }
        }
        return Promise.reject(error)
    }
)

export default axiosInstance;
