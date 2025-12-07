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
    
    // Only redirect if we're not already on the login page or reset password page
    if (!window.location.pathname.includes('/admin/login') && !window.location.pathname.includes('/admin/reset-password')) {
      window.location.href = '/admin/login';
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

/**
 * Settings API methods
 */
export interface Settings {
  planPricing: {
    '1month': number;
    '2month': number;
    '3month': number;
    '6month': number;
    'yearly': number;
  };
  gymInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    businessHours: string;
    footer: {
      openingHours: {
        days: string;
        morningHours: string;
        eveningHours: string;
      };
      paymentMethods: string;
      contactEmail: string;
      contactPhone: string;
    };
  };
  emailSettings: {
    enabled: boolean;
    fromEmail: string;
    fromName: string;
  };
  notificationSettings: {
    emailNotifications: boolean;
    whatsappNotifications: boolean;
    renewalReminders: boolean;
    expiryReminders: boolean;
  };
  systemPreferences: {
    currency: string;
    currencySymbol: string;
    dateFormat: string;
    timezone: string;
  };
}

export const getSettings = async (): Promise<Settings> => {
  const response = await apiClient('/api/settings', {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch settings');
  }

  const data = await response.json();
  return data.data;
};

export const updateSettings = async (settings: Partial<Settings>): Promise<Settings> => {
  const response = await apiClient('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update settings');
  }

  const data = await response.json();
  return data.data;
};

// Public method to get plan pricing (no auth required)
export const getPlanPricing = async (): Promise<Settings['planPricing']> => {
  const response = await fetch(`${API_BASE_URL}/api/settings/pricing`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch plan pricing');
  }

  const data = await response.json();
  return data.data.planPricing;
};

// Public method to get gym info (no auth required)
export const getGymInfo = async (): Promise<Settings['gymInfo']> => {
  const response = await fetch(`${API_BASE_URL}/api/settings/gym-info`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch gym info');
  }

  const data = await response.json();
  return data.data.gymInfo;
};

