import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../App';

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Create a promise that resolves after 1 second
    const minimumLoadingTime = new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      // Wait for minimum loading time
      await minimumLoadingTime;

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Invalid email or password');
      }

      const data = await response.json();

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      toast.success('Login successful!');
      onLogin();
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Login failed. Please try again.');
        toast.error(err.message || 'Login failed. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl p-10 transform transition-all hover:scale-[1.01]">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Admin Login</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-r-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Email</label>
          <input
            type="email"
            required
            className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200"
            value={credentials.email}
            onChange={(e) => {
              setError('');
              setCredentials({ ...credentials, email: e.target.value });
            }}
            disabled={isLoading}
            placeholder="Enter your email"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Password</label>
          <input
            type="password"
            required
            className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200"
            value={credentials.password}
            onChange={(e) => {
              setError('');
              setCredentials({ ...credentials, password: e.target.value });
            }}
            disabled={isLoading}
            placeholder="Enter your password"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full px-6 py-3 text-lg font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 ${
            isLoading 
              ? 'opacity-50 cursor-not-allowed bg-yellow-500' 
              : 'bg-yellow-500 hover:bg-yellow-600 hover:-translate-y-0.5'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging in...
            </span>
          ) : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;