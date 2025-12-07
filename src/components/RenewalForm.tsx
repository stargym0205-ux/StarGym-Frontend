import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, QrCode, Smartphone, CheckCircle2, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../App';
import { addMonths } from 'date-fns';
import { getPlanPricing } from '../utils/apiClient';

interface RenewalFormData {
  plan: '1month' | '2month' | '3month' | '6month' | 'yearly';
  startDate: string;
  endDate: string;
  paymentMethod: 'cash' | 'online';
}

interface PlanOption {
  id: '1month' | '2month' | '3month' | '6month' | 'yearly';
  name: string;
  price: number;
  months: number;
}

// Default plans structure (will be updated with pricing from settings)
const defaultPlans: PlanOption[] = [
  {
    id: '1month',
    name: '1 Month',
    price: 1500,
    months: 1
  },
  {
    id: '2month',
    name: '2 Months',
    price: 2500,
    months: 2
  },
  {
    id: '3month',
    name: '3 Months',
    price: 3500,
    months: 3
  },
  {
    id: '6month',
    name: '6 Months',
    price: 5000,
    months: 6
  },
  {
    id: 'yearly',
    name: '1 Year',
    price: 8000,
    months: 12
  }
];

const RenewalForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanOption[]>(defaultPlans);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState<RenewalFormData>({
    plan: '1month',
    startDate: new Date().toISOString().split('T')[0],
    endDate: addMonths(new Date(), 1).toISOString().split('T')[0],
    paymentMethod: 'online',
  });
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('created');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch plan pricing from settings on component mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setIsLoadingPricing(true);
        const pricing = await getPlanPricing();
        
        // Update plans with fetched pricing
        setPlans(prevPlans => 
          prevPlans.map(plan => ({
            ...plan,
            price: pricing[plan.id] || plan.price // Use fetched price or fallback to default
          }))
        );
      } catch (error: any) {
        console.error('Error fetching plan pricing:', error);
        // Keep default prices if fetch fails
        toast.error('Failed to load plan pricing. Using default prices.');
      } finally {
        setIsLoadingPricing(false);
      }
    };

    fetchPricing();
  }, []);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        if (!token) {
          throw new Error('No renewal token provided');
        }

        const response = await fetch(`${API_BASE_URL}/api/users/verify-renewal-token/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Invalid or expired renewal token');
        }

        const data = await response.json();
        if (!data.user) {
          throw new Error('User data not found');
        }
        
        setUserData(data.user);
      } catch (error: any) {
        console.error('Token verification error:', error);
        toast.error(error.message || 'Failed to verify renewal token');
        navigate('/');
      }
    };

    verifyToken();
  }, [token, navigate]);

  const handlePlanChange = (planId: '1month' | '2month' | '3month' | '6month' | 'yearly') => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (selectedPlan) {
      const startDate = new Date();
      const endDate = addMonths(startDate, selectedPlan.months);
      setFormData({
        ...formData,
        plan: planId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      // Clear payment data when plan changes
      setPaymentData(null);
    }
  };

  const handlePaymentMethodChange = (method: 'cash' | 'online') => {
    setFormData({ ...formData, paymentMethod: method });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleOpenUPI = () => {
    if (paymentData?.upiIntent) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        try {
          window.location.href = paymentData.upiIntent;
          setTimeout(() => {
            toast('If UPI app didn\'t open, please scan the QR code instead', {
              icon: 'ℹ️',
              duration: 3000
            });
          }, 1000);
        } catch (error) {
          toast.error('Failed to open UPI app. Please scan the QR code instead.');
        }
      } else {
        toast('Please use a mobile device or scan the QR code with your UPI app', {
          icon: '📱',
          duration: 4000
        });
        try {
          window.location.href = paymentData.upiIntent;
        } catch (error) {
          console.error('Error opening UPI link:', error);
        }
      }
    } else {
      toast.error('Payment link not available');
    }
  };

  // Poll payment status for online payments
  useEffect(() => {
    if (!paymentData?.orderId || paymentStatus === 'paid' || paymentStatus === 'failed' || paymentStatus === 'expired' || !showPaymentQR) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        setIsPolling(true);
        const response = await fetch(`${API_BASE_URL}/api/payments/status/${paymentData.orderId}`);
        const data = await response.json();

        if (data.status === 'success' && data.data) {
          const newStatus = data.data.state;
          setPaymentStatus(newStatus);

          if (newStatus === 'paid') {
            clearInterval(pollInterval);
            toast.success('Payment confirmed!');
            setTimeout(() => {
              navigate('/renewal-thank-you');
            }, 2000);
          } else if (newStatus === 'failed' || newStatus === 'expired') {
            clearInterval(pollInterval);
            toast.error('Payment failed or expired');
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      } finally {
        setIsPolling(false);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [paymentData?.orderId, paymentStatus, showPaymentQR, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!paymentData?.expiresAt || timeRemaining <= 0 || paymentStatus !== 'created' || !showPaymentQR) return;

    const expiresAt = new Date(paymentData.expiresAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
    setTimeRemaining(remaining);

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setPaymentStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentData?.expiresAt, paymentStatus, showPaymentQR]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const requestBody: any = { ...formData };

      const response = await fetch(`${API_BASE_URL}/api/users/renew-membership/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to process renewal request');
      }

      const data = await response.json();
      
      // If online payment, fetch payment details and show QR code
      if (formData.paymentMethod === 'online' && data.paymentData) {
        setPaymentData(data.paymentData);
        setShowPaymentQR(true);
        setPaymentStatus('created');
        const expiresAt = new Date(data.paymentData.expiresAt).getTime();
        const now = Date.now();
        setTimeRemaining(Math.max(0, Math.floor((expiresAt - now) / 1000)));
        toast.success('Renewal request submitted! Please complete the payment.');
      } else if (formData.paymentMethod === 'cash') {
        toast.success('Renewal request submitted successfully!');
        navigate('/renewal-thank-you');
      } else {
        // If online but no payment data, try to fetch it
        if (data.orderId) {
          const paymentResponse = await fetch(`${API_BASE_URL}/api/payments/details/${data.orderId}`);
          const paymentData = await paymentResponse.json();
          if (paymentData.status === 'success') {
            setPaymentData(paymentData.data);
            setShowPaymentQR(true);
            setPaymentStatus('created');
            const expiresAt = new Date(paymentData.data.expiresAt).getTime();
            const now = Date.now();
            setTimeRemaining(Math.max(0, Math.floor((expiresAt - now) / 1000)));
            toast.success('Renewal request submitted! Please complete the payment.');
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto panel-card overflow-hidden">
        <div className="px-6 py-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold accent-text mb-2">Renew Your Membership</h2>
            <p className="text-gray-700">Welcome back, {userData.name}!</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Plan</label>
                {isLoadingPricing ? (
                  <div className="mt-2 flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                    <span className="ml-3 text-gray-600">Loading plans...</span>
                  </div>
                ) : (
                <div className="mt-2 grid grid-cols-1 gap-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => handlePlanChange(plan.id)}
                      className={`relative rounded-lg border p-4 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                        formData.plan === plan.id
                          ? 'border-yellow-500 bg-yellow-100'
                          : 'border-gray-200 hover:border-yellow-400 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                          <p className="text-sm text-gray-500">₹{plan.price.toLocaleString()}</p>
                        </div>
                        {formData.plan === plan.id && (
                          <div className="h-5 w-5 text-yellow-500">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as 'cash' | 'online')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-500 sm:text-sm rounded-md"
                >
                  <option value="online">Online Payment</option>
                  <option value="cash">Cash Payment</option>
                </select>
              </div>

            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-medium btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Submit Renewal Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Payment QR Code Modal - Opens systematically in a modal overlay */}
      {showPaymentQR && paymentData && formData.paymentMethod === 'online' && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn"
          onClick={(e) => {
            // Close modal if clicking outside (but not if payment is in progress)
            if (e.target === e.currentTarget && paymentStatus !== 'created') {
              setShowPaymentQR(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold accent-text">Complete Your Payment</h3>
                {paymentStatus !== 'created' && (
                  <button
                    onClick={() => {
                      setShowPaymentQR(false);
                      navigate('/renewal-thank-you');
                    }}
                    className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Close"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Payment Status */}
              <div className="mb-6">
                {paymentStatus === 'paid' && (
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-800">Payment Confirmed!</p>
                      <p className="text-sm text-green-600">Redirecting to confirmation page...</p>
                    </div>
                  </div>
                )}
                {paymentStatus === 'failed' && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-semibold text-red-800">Payment Failed</p>
                      <p className="text-sm text-red-600">Please try again or contact support</p>
                    </div>
                  </div>
                )}
                {paymentStatus === 'expired' && (
                  <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-4 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-orange-500" />
                    <div>
                      <p className="font-semibold text-orange-800">Payment Expired</p>
                      <p className="text-sm text-orange-600">Please submit renewal again to generate a new payment link</p>
                    </div>
                  </div>
                )}
                {paymentStatus === 'created' && (
                  <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-800">Waiting for Payment</p>
                      <p className="text-sm text-blue-600">
                        Time remaining: <span className="font-bold">{formatTime(timeRemaining)}</span>
                      </p>
                    </div>
                    {isPolling && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                  </div>
                )}
              </div>

              {/* Payment Amount */}
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg p-6 mb-6 text-center">
                <p className="text-gray-700 text-sm mb-2">Amount to Pay</p>
                <p className="text-4xl font-bold text-gray-900">{formatPrice(paymentData.amount)}</p>
                <p className="text-gray-700 text-sm mt-2">Order ID: {paymentData.orderId}</p>
              </div>

              {/* QR Code */}
              {paymentStatus === 'created' && (
                <div className="mb-6">
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 flex flex-col items-center shadow-lg border-2 border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <QrCode className="w-6 h-6 text-yellow-500" />
                      <p className="text-lg font-bold text-gray-800">Scan QR Code to Pay</p>
                    </div>
                    {paymentData.qrImage ? (
                      <div className="bg-white p-6 rounded-xl border-4 border-yellow-400 shadow-xl">
                        <img
                          src={paymentData.qrImage}
                          alt="Payment QR Code"
                          className="w-72 h-72 mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-8 rounded-xl border-2 border-gray-300">
                        <p className="text-gray-500 text-center">QR Code loading...</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-4 text-center">
                      Scan with any UPI app (GPay, PhonePe, Paytm, etc.) to pay automatically
                    </p>
                  </div>
                </div>
              )}

              {/* UPI Intent Button */}
              <div className="mb-6">
                <button
                  onClick={handleOpenUPI}
                  disabled={paymentStatus !== 'created'}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${
                    paymentStatus === 'created'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  Open in UPI App (GPay/PhonePe/Paytm)
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Payment Instructions:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li><strong>Scan QR Code:</strong> Open any UPI app (GPay, PhonePe, Paytm, etc.) and scan the QR code. The app will open automatically with the payment amount pre-filled.</li>
                  <li><strong>Or Click Button:</strong> Click "Open in UPI App" button above to see all available UPI apps and select one (GPay, PhonePe, Paytm, etc.)</li>
                  <li>Verify the amount and payee details before confirming the payment</li>
                  <li>Your payment will be automatically confirmed once completed</li>
                  <li>You will be redirected to the confirmation page once payment is successful</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RenewalForm; 