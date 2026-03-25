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
    timeout: 10000,
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
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default axiosInstance;