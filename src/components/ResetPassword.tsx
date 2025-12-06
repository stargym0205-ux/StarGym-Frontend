import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../App';
import { Dumbbell, Calendar, CreditCard, Eye, EyeOff } from 'lucide-react';

// NavBar component
function NavBar() {
  return (
    <nav className="bg-black bg-opacity-50 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Dumbbell className="text-yellow-500 animate-bounce" size={24} />
          <span className="text-white text-2xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300 cursor-default">
            Star Gym
          </span>
        </div>
      </div>
    </nav>
  );
}

// Footer component
function Footer() {
  return (
    <footer className="bg-black bg-opacity-50 text-white py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="mr-2" size={20} /> Opening Hours
            </h3>
            <p>Monday - Saturday</p>
            <p>Morning: 6:00 AM - 9:00 AM</p>
            <p>Evening: 4:00 PM - 9:00 PM</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CreditCard className="mr-2" size={20} /> Payment Methods
            </h3>
            <p>Cash</p>
            <p>Online Payment</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <p>Email: admin@gmail.com</p>
            <p>Phone: 9101321032</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(true);
      toast.success('Password has been reset successfully!');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to reset password. Please try again.');
        toast.error(err.message || 'Failed to reset password. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
      <NavBar />
      <main className="flex-grow flex items-center justify-center px-2 py-8">
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-10 mx-auto transform transition-all hover:scale-[1.01]">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Reset Password</h2>
          {error && (
            <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-r-lg">
              {error}
            </div>
          )}
          {success ? (
            <div className="space-y-6">
              <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-r-lg">
                <p className="font-semibold">Password reset successful!</p>
                <p className="mt-2 text-sm">Redirecting to login page...</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="w-full px-6 py-3 text-lg font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 bg-yellow-500 hover:bg-yellow-600 hover:-translate-y-0.5"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="mt-1 block w-full px-4 py-3 pr-12 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200"
                    value={password}
                    onChange={(e) => {
                      setError('');
                      setPassword(e.target.value);
                    }}
                    disabled={isLoading}
                    placeholder="Enter new password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff size={20} className="cursor-pointer" />
                    ) : (
                      <Eye size={20} className="cursor-pointer" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Password must be at least 8 characters long</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="mt-1 block w-full px-4 py-3 pr-12 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200"
                    value={confirmPassword}
                    onChange={(e) => {
                      setError('');
                      setConfirmPassword(e.target.value);
                    }}
                    disabled={isLoading}
                    placeholder="Confirm new password"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} className="cursor-pointer" />
                    ) : (
                      <Eye size={20} className="cursor-pointer" />
                    )}
                  </button>
                </div>
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
                    Resetting...
                  </span>
                ) : 'Reset Password'}
              </button>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium hover:underline focus:outline-none"
                  disabled={isLoading}
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;

