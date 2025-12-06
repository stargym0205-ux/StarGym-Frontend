import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Clock, QrCode, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../App';

interface PaymentData {
  orderId: string;
  paymentId: string;
  upiIntent: string;
  qrImage: string;
  amount: number;
  currency: string;
  expiresAt: string;
  status: string;
}

const PaymentDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('created');
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Fetch payment details
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!orderId) {
        toast.error('Invalid payment order ID');
        navigate('/');
        return;
      }

      try {
        // First, get payment status to check if it exists
        const statusResponse = await fetch(`${API_BASE_URL}/api/payments/status/${orderId}`);
        const statusData = await statusResponse.json();

        if (!statusResponse.ok || statusData.status === 'error') {
          toast.error('Payment not found');
          navigate('/');
          return;
        }

        // If payment is already paid, redirect to thank you
        if (statusData.data.state === 'paid') {
          toast.success('Payment already confirmed!');
          navigate('/thank-you');
          return;
        }

        // Set payment status and time remaining
        setPaymentStatus(statusData.data.state);
        setTimeRemaining(
          statusData.data.expiresAt
            ? Math.max(0, Math.floor((new Date(statusData.data.expiresAt).getTime() - Date.now()) / 1000))
            : 900
        );

        // Try to get payment details from localStorage first, then fetch from backend
        const storedPayment = localStorage.getItem(`payment_${orderId}`);
        if (storedPayment) {
          const parsedPayment = JSON.parse(storedPayment);
          setPaymentData(parsedPayment);
          setIsLoading(false);
        } else {
          // If not in localStorage, fetch from backend
          const detailsResponse = await fetch(`${API_BASE_URL}/api/payments/details/${orderId}`);
          const detailsData = await detailsResponse.json();

          if (!detailsResponse.ok || detailsData.status === 'error') {
            toast.error('Payment details not found. Please try registering again.');
            navigate('/');
            return;
          }

          // Store in localStorage for future use
          localStorage.setItem(`payment_${orderId}`, JSON.stringify(detailsData.data));
          setPaymentData(detailsData.data);
          setIsLoading(false);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching payment details:', error);
        toast.error('Failed to load payment details');
        navigate('/');
      }
    };

    fetchPaymentDetails();
  }, [orderId, navigate]);

  // Poll payment status
  useEffect(() => {
    if (!orderId || paymentStatus === 'paid' || paymentStatus === 'failed' || paymentStatus === 'expired') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        setIsPolling(true);
        const response = await fetch(`${API_BASE_URL}/api/payments/status/${orderId}`);
        const data = await response.json();

        if (data.status === 'success' && data.data) {
          const newStatus = data.data.state;
          setPaymentStatus(newStatus);

          if (newStatus === 'paid') {
            clearInterval(pollInterval);
            toast.success('Payment confirmed!');
            setTimeout(() => {
              navigate('/thank-you');
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
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [orderId, paymentStatus, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0 || paymentStatus !== 'created') return;

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
  }, [timeRemaining, paymentStatus]);

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
      // Check if we're on mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, directly set location to trigger UPI app
        // This will show app selection dialog (GPay, PhonePe, Paytm, etc.)
        try {
          window.location.href = paymentData.upiIntent;
          
          // Show a message after a short delay in case app doesn't open
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
        // On desktop, show message to use mobile or scan QR code
        toast('Please use a mobile device or scan the QR code with your UPI app', {
          icon: '📱',
          duration: 4000
        });
        
        // Still try to open, in case user has UPI app installed on desktop
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

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="panel-card p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-yellow-500" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="panel-card p-8 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600">Payment details not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="panel-card p-8">
        <h2 className="text-3xl font-bold text-center mb-6 accent-text">Complete Your Payment</h2>

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
                <p className="text-sm text-orange-600">Please register again to generate a new payment link</p>
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

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 underline"
          >
            Back to Registration
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;

