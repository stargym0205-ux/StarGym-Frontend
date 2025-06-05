import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../App';
import { Calendar, CreditCard, User, Mail, Phone, Clock } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  duration: string;
  price: number;
  features: string[];
}

interface User {
  userId: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  plan: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  subscriptionStatus: string;
  paymentStatus: string;
  gender: string;
  currentPlan: {
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  };
}

const plans: Plan[] = [
  { 
    id: '1month', 
    name: '1 Month Plan', 
    duration: '1 month', 
    price: 1500,
    features: []
  },
  { 
    id: '2month', 
    name: '2 Month Plan', 
    duration: '2 months', 
    price: 2500,
    features: []
  },
  { 
    id: '3month', 
    name: '3 Month Plan', 
    duration: '3 months', 
    price: 3500,
    features: []
  },
  { 
    id: '6month', 
    name: '6 Month Plan', 
    duration: '6 months', 
    price: 5000,
    features: []
  },
  { 
    id: 'yearly', 
    name: 'Yearly Plan', 
    duration: '12 months', 
    price: 8000,
    features: []
  },
];

const getPlanAmount = (planId: string): number => {
  const plan = plans.find(p => p.id === planId);
  return plan?.price || 0;
};

const RenewMembership: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        if (!token) {
          setIsTokenValid(false);
          setIsLoadingUserData(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/users/verify-token/${token}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to verify token');
        }

        const data = await response.json();
        setUserData(data.data);
        setIsTokenValid(true);
      } catch (error) {
        console.error('Token verification error:', error);
        setIsTokenValid(false);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Renewal button clicked');
    
    if (!selectedPlan) {
      console.log('No plan selected');
      toast.error('Please select a plan');
      return;
    }

    if (!userData?.userId) {
      console.log('No user data found:', userData);
      toast.error('User information not found');
      return;
    }

    try {
      console.log('Starting renewal request with data:', {
        userId: userData.userId,
        plan: selectedPlan,
        paymentMethod,
        amount: getPlanAmount(selectedPlan)
      });

      setIsLoading(true);
      
      const requestUrl = `${API_BASE_URL}/api/users/request-renewal`;
      console.log('Making request to:', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userData.userId,
          plan: selectedPlan,
          paymentMethod: paymentMethod,
          amount: getPlanAmount(selectedPlan)
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit renewal request');
      }

      toast.success('Renewal request submitted successfully! Please wait for admin approval.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#10B981',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
        },
      });

      // Redirect to a pending page instead of success
      navigate('/renewal-pending');
    } catch (error: any) {
      console.error('Renewal error:', error);
      toast.error(error.message || 'Failed to submit renewal request', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-600';
      case 'expired':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const color = getStatusColor(status);
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} bg-opacity-10`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoadingUserData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="text-gray-600">Loading member information...</p>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid or Expired Link</h2>
          <p className="text-gray-600 mb-6">
            This renewal link is invalid or has expired. Please contact the gym administration for assistance.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors duration-200"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const selectedPlanDetails = plans.find(plan => plan.id === selectedPlan);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Renew Your Membership</h1>
          <p className="mt-2 text-gray-600">Select your plan and complete the renewal process</p>
        </div>

        {isLoadingUserData ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : !userData ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600">Invalid or expired token. Please request a new renewal link.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Information Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-4">
                <img
                  src={userData.photo || 'https://res.cloudinary.com/dovjfipbt/image/upload/v1/default-avatar'}
                  alt={userData.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500"
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{userData.name}</h2>
                  <div className="mt-1 space-y-1">
                    <p className="text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {userData.email}
                    </p>
                    <p className="text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {userData.phone}
                    </p>
                    <p className="text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {userData.gender}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Selection Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Your Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      selectedPlan === plan.id
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-200 hover:border-yellow-300'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-3xl font-bold text-yellow-600 mb-1">₹{plan.price}</p>
                      <p className="text-sm text-gray-500">{plan.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    paymentMethod === 'cash'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Cash Payment</h3>
                      <p className="text-sm text-gray-500">Pay at the gym counter</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    paymentMethod === 'online'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-yellow-300'
                  }`}
                  onClick={() => setPaymentMethod('online')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Online Payment</h3>
                      <p className="text-sm text-gray-500">Pay securely online</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Selected Plan</span>
                  <span className="font-medium text-gray-900">
                    {plans.find(p => p.id === selectedPlan)?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium text-gray-900">
                    {plans.find(p => p.id === selectedPlan)?.duration}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="font-medium text-gray-900 capitalize">{paymentMethod}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Amount</span>
                    <span className="text-2xl font-bold text-yellow-600">
                      ₹{plans.find(p => p.id === selectedPlan)?.price}
                    </span>
                  </div>
                </div>
              </div>
        </div>

        {/* Submit Button */}
            <div className="flex justify-end">
        <button
                onClick={handleRenewal}
                disabled={isLoading || !selectedPlan || !paymentMethod}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors duration-200 ${
                  isLoading || !selectedPlan || !paymentMethod
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Complete Renewal'
                )}
        </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RenewMembership; 