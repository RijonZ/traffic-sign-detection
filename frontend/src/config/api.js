const DEFAULT_BACKEND_URL = "http://127.0.0.1:5000";

export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
  DEFAULT_BACKEND_URL
).replace(/\/$/, "");

export const API_BASE_URL = `${BACKEND_URL}/api`;
