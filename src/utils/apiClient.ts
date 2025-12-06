import { API_BASE_URL } from '../App';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * API client with automatic token handling and error management
 */
export const apiClient = async (
  endpoint: string,
  options: ApiOptions = {}
): Promise<Response> => {
  const { requireAuth = true, headers = {}, ...restOptions } = options;

  // Get token from localStorage
  const token = localStorage.getItem('token');

  // Prepare headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authorization header if auth is required
  if (requireAuth) {
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Make the request
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: requestHeaders,
    credentials: 'include', // Important for cookies
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    // Clear token and redirect to login
    localStorage.removeItem('token');
    
    // Only redirect if we're not already on the login page
    if (!window.location.pathname.includes('/admin') || window.location.pathname.includes('/admin/reset-password')) {
      window.location.href = '/admin';
    }
    
    throw new Error('Session expired. Please login again.');
  }

  return response;
};

/**
 * Verify authentication token
 */
export const verifyAuth = async (): Promise<boolean> => {
  try {
    const response = await apiClient('/api/auth/verify', {
      method: 'GET',
    });

    return response.ok;
  } catch (error) {
    return false;
  }
};

