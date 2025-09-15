import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../App';
import { addMonths } from 'date-fns';

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

const plans: PlanOption[] = [
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
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState<RenewalFormData>({
    plan: '1month',
    startDate: new Date().toISOString().split('T')[0],
    endDate: addMonths(new Date(), 1).toISOString().split('T')[0],
    paymentMethod: 'online',
  });

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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/renew-membership/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to process renewal request');
      }

      await response.json();
      toast.success('Renewal request submitted successfully!');
      navigate('/renewal-thank-you');
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'cash' | 'online' })}
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
    </div>
  );
};

export default RenewalForm; 