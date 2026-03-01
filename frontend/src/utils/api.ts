export const API_URL = "/api/events/";

export function getCookie(name: string): string | null {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    // Set up headers
    const headers = new Headers(options.headers || {});

    // Always include credentials to send session cookies
    options.credentials = 'include';

    // Default to JSON if not set and method is writing data
    if ((options.method || 'GET').toUpperCase() !== 'GET' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Attempt to attach CSRF token for non-safe methods (if it exists)
    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
        const csrfToken = getCookie('csrftoken');
        if (csrfToken) {
            headers.set('X-CSRFToken', csrfToken);
        }
    }

    options.headers = headers;

    const response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
        console.warn(`API request unauthorized/forbidden (${response.status}). The user may need to log in.`);
    }

    return response;
}

