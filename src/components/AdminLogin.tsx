import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../App';
import { Dumbbell, Calendar, CreditCard, Eye, EyeOff } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
}

// NavBar component (copied from App.tsx, without logout button)
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

// Footer component (copied from App.tsx)
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

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

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
      // Redirect to admin panel after successful login
      setTimeout(() => {
        window.location.href = '/admin';
      }, 500);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotPasswordLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: forgotPasswordEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      setForgotPasswordSuccess(true);
      setShowOTPVerification(true);
      toast.success('OTP has been sent to your email');
    } catch (err) {
      console.error('Forgot password error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to send reset email. Please try again.');
        toast.error(err.message || 'Failed to send reset email. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: forgotPasswordEmail, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }

      if (data.resetToken) {
        setResetToken(data.resetToken);
        toast.success('OTP verified successfully! Redirecting to reset password...');
        // Redirect to reset password page with token
        setTimeout(() => {
          window.location.href = `/admin/reset-password/${data.resetToken}`;
        }, 1000);
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Invalid OTP. Please try again.');
        toast.error(err.message || 'Invalid OTP. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
      <NavBar />
      <main className="flex-grow flex items-center justify-center px-2 py-8">
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-10 mx-auto transform transition-all hover:scale-[1.01]">
          {!showForgotPassword ? (
            <>
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="mt-1 block w-full px-4 py-3 pr-12 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200"
                  value={credentials.password}
                  onChange={(e) => {
                    setError('');
                    setCredentials({ ...credentials, password: e.target.value });
                  }}
                  disabled={isLoading}
                  placeholder="Enter your password"
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
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-yellow-600 hover:text-yellow-700 font-medium hover:underline focus:outline-none"
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            </div>
          </form>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Forgot Password</h2>
              {error && (
                <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-r-lg">
                  {error}
                </div>
              )}
              {showOTPVerification ? (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="mb-6 p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 rounded-r-lg">
                    <p className="font-semibold">OTP Sent!</p>
                    <p className="mt-2 text-sm">Please check your email for the 6-digit OTP code. The OTP will expire in 10 minutes.</p>
                  </div>
                  {error && (
                    <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-r-lg">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Enter OTP</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200 text-center text-2xl tracking-widest font-mono"
                      value={otp}
                      onChange={(e) => {
                        setError('');
                        // Only allow numbers and limit to 6 digits
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(value);
                      }}
                      disabled={otpLoading}
                      placeholder="000000"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Enter the 6-digit code sent to {forgotPasswordEmail}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={otpLoading || otp.length !== 6}
                    className={`w-full px-6 py-3 text-lg font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 ${
                      otpLoading || otp.length !== 6
                        ? 'opacity-50 cursor-not-allowed bg-yellow-500' 
                        : 'bg-yellow-500 hover:bg-yellow-600 hover:-translate-y-0.5'
                    }`}
                  >
                    {otpLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </span>
                    ) : 'Verify OTP'}
                  </button>
                  <div className="text-center mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOTPVerification(false);
                        setOtp('');
                        setError('');
                      }}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium hover:underline focus:outline-none"
                      disabled={otpLoading}
                    >
                      Resend OTP
                    </button>
                    <br />
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setShowOTPVerification(false);
                        setForgotPasswordEmail('');
                        setForgotPasswordSuccess(false);
                        setOtp('');
                        setError('');
                      }}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium hover:underline focus:outline-none"
                      disabled={otpLoading}
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              ) : forgotPasswordSuccess ? (
                <div className="space-y-6">
                  <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-r-lg">
                    <p className="font-semibold">Email sent successfully!</p>
                    <p className="mt-2 text-sm">Please check your email for the OTP code. The OTP will expire in 10 minutes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOTPVerification(true);
                    }}
                    className="w-full px-6 py-3 text-lg font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 bg-yellow-500 hover:bg-yellow-600 hover:-translate-y-0.5"
                  >
                    Enter OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail('');
                      setForgotPasswordSuccess(false);
                      setError('');
                    }}
                    className="w-full px-6 py-3 text-lg font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 bg-gray-600 hover:bg-gray-700 hover:-translate-y-0.5"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Email</label>
                    <input
                      type="email"
                      required
                      className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200"
                      value={forgotPasswordEmail}
                      onChange={(e) => {
                        setError('');
                        setForgotPasswordEmail(e.target.value);
                      }}
                      disabled={forgotPasswordLoading}
                      placeholder="Enter your email"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Enter your email address and we'll send you an OTP code to reset your password.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className={`w-full px-6 py-3 text-lg font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 ${
                      forgotPasswordLoading 
                        ? 'opacity-50 cursor-not-allowed bg-yellow-500' 
                        : 'bg-yellow-500 hover:bg-yellow-600 hover:-translate-y-0.5'
                    }`}
                  >
                    {forgotPasswordLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : 'Send OTP'}
                  </button>
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail('');
                        setError('');
                      }}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium hover:underline focus:outline-none"
                      disabled={forgotPasswordLoading}
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminLogin;