import React, { useState, useEffect } from 'react';
import { Users, Calendar, CreditCard, CheckCircle, Eye, Edit, Trash, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../App';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  photo: string;
  plan: string;
  startDate: string;
  endDate: string;
  paymentMethod: string;
  paymentStatus: string;
}

interface RenewalRequest {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  requestId: string;
  plan: string;
  paymentMethod: string;
  amount: number;
  requestedAt: string;
  status: string;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'renewals' | '1month' | '2month' | '3month' | '6month' | 'yearly' | 'expired' | 'online-payment'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedUserForNotification, setSelectedUserForNotification] = useState<User | null>(null);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [pendingRenewals, setPendingRenewals] = useState<RenewalRequest[]>([]);
  const [isLoadingRenewals, setIsLoadingRenewals] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth); // 0-indexed

  const fetchUsers = async () => {
    try {
      setIsRefreshing(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setUsers(data.data.users);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchPendingRenewals = async () => {
    try {
      setIsLoadingRenewals(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/pending-renewals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending renewals');
      }

      const data = await response.json();
      console.log('Pending renewals data:', data);
      setPendingRenewals(data.data);
    } catch (error) {
      console.error('Error fetching pending renewals:', error);
      toast.error('Failed to fetch pending renewals');
    } finally {
      setIsLoadingRenewals(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingRenewals();
  }, []);

  const filteredUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone.includes(searchTerm)
      );
    }

    // Apply tab filters
    switch (activeTab) {
      case 'pending':
        return filtered.filter(user => user.paymentStatus === 'pending');
      case 'expired':
        return filtered.filter(user => {
          const endDate = new Date(user.endDate);
          return endDate < new Date();
        });
      case '1month':
        return filtered.filter(user => user.plan === '1month' && !isSubscriptionExpired(user.endDate));
      case '2month':
        return filtered.filter(user => user.plan === '2month' && !isSubscriptionExpired(user.endDate));
      case '3month':
        return filtered.filter(user => user.plan === '3month' && !isSubscriptionExpired(user.endDate));
      case '6month':
        return filtered.filter(user => user.plan === '6month' && !isSubscriptionExpired(user.endDate));
      case 'yearly':
        return filtered.filter(user => user.plan === 'yearly' && !isSubscriptionExpired(user.endDate));
      case 'online-payment':
        return filtered.filter(user => user.paymentMethod === 'online' && !isSubscriptionExpired(user.endDate));
      default:
        return filtered.filter(user => !isSubscriptionExpired(user.endDate));
    }
  };

  const isSubscriptionExpired = (endDate: string | Date) => {
    return new Date(endDate) < new Date();
  };

  const getSubscriptionStatus = (endDate: string | Date) => {
    if (isSubscriptionExpired(endDate)) {
      return {
        text: 'Expired',
        color: 'text-red-600'
      };
    }
    return {
      text: 'Active',
      color: 'text-green-600'
    };
  };

  const getPlanAmount = (plan: string): number => {
    const amounts: Record<string, number> = {
      '1month': 1500,
      '2month': 2500,
      '3month': 3500,
      '6month': 5000,
      'yearly': 8000
    };
    return amounts[plan] || 0;
  };

  const getPlanAmountDisplay = (plan: string): string => {
    const amounts: Record<string, string> = {
      '1month': '₹1,500',
      '2month': '₹2,500',
      '3month': '₹3,500',
      '6month': '₹5,000',
      'yearly': '₹8,000'
    };
    return amounts[plan] || 'N/A';
  };

  const approvePayment = async (userId: string) => {
    if (!window.confirm('Are you sure you want to approve this payment?')) {
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, [userId]: true }));
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/approve/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve payment');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        setUsers(users.map(user => 
          user._id === userId 
            ? { ...user, paymentStatus: 'confirmed' } 
            : user
        ));
        toast.success('Payment approved successfully!', {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve payment', {
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
      setLoadingStates(prev => ({ ...prev, [userId]: false }));
    }
  };

  const notifyExpiredMember = async (userId: string, userEmail: string, userName: string) => {
    try {
      setIsNotifying(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/notify-expired/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userEmail,
          name: userName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Notification sent successfully!', {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
        });
        setShowNotificationModal(false);
        setSelectedUserForNotification(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send notification', {
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
      setIsNotifying(false);
    }
  };

  const calculateMonthlyRevenue = (month: number, year: number) => {
    return users
      .filter(user => {
        const userDate = new Date(user.startDate);
        return userDate.getMonth() === month && 
               userDate.getFullYear() === year &&
               user.paymentStatus === 'confirmed';
      })
      .reduce((total, user) => total + getPlanAmount(user.plan), 0);
  };

  const calculateYearlyRevenue = (year: number) => {
    return users
      .filter(user => {
        const userDate = new Date(user.startDate);
        return userDate.getFullYear() === year &&
               user.paymentStatus === 'confirmed';
      })
      .reduce((total, user) => total + getPlanAmount(user.plan), 0);
  };

  const calculateRevenueByPlan = () => {
    const planRevenue: Record<string, number> = {
      '1month': 0,
      '2month': 0,
      '3month': 0,
      '6month': 0,
      'yearly': 0
    };

    users
      .filter(user => user.paymentStatus === 'confirmed')
      .forEach(user => {
        planRevenue[user.plan] = (planRevenue[user.plan] || 0) + getPlanAmount(user.plan);
      });

    return planRevenue;
  };

  const calculateTotalRevenue = () => {
    return users
      .filter(user => user.paymentStatus === 'confirmed')
      .reduce((total, user) => total + getPlanAmount(user.plan), 0);
  };

  const calculateTotalCashRevenue = (month: number, year: number) => {
    return users
      .filter(user => {
        const userDate = new Date(user.startDate);
        return userDate.getMonth() === month && 
               userDate.getFullYear() === year &&
               user.paymentMethod === 'cash' && 
               user.paymentStatus === 'confirmed';
      })
      .reduce((total, user) => total + getPlanAmount(user.plan), 0);
  };

  const calculateTotalOnlineRevenue = (month: number, year: number) => {
    return users
      .filter(user => {
        const userDate = new Date(user.startDate);
        return userDate.getMonth() === month && 
               userDate.getFullYear() === year &&
               user.paymentMethod === 'online' && 
               user.paymentStatus === 'confirmed';
      })
      .reduce((total, user) => total + getPlanAmount(user.plan), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPhotoUrl = (photoPath: string) => {
    if (!photoPath) {
      return `https://res.cloudinary.com/dovjfipbt/image/upload/v1744948014/default-avatar`;
    }
    
    if (photoPath.includes('cloudinary.com')) {
      return photoPath;
    }
    
    return `https://res.cloudinary.com/dovjfipbt/image/upload/v1744948014/default-avatar`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = `https://res.cloudinary.com/dovjfipbt/image/upload/v1744948014/default-avatar`;
  };

  const deleteMember = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this member?')) {
      return;
    }

    try {
      setIsDeleting(prev => ({ ...prev, [userId]: true }));
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete member');
      }

      setUsers(currentUsers => currentUsers.filter(u => u._id !== userId));
      toast.success('Member deleted successfully', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#10B981',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
        },
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete member', {
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
      setIsDeleting(prev => ({ ...prev, [userId]: false }));
    }
  };

  const approveRenewalRequest = async (userId: string, requestId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/approve-renewal/${userId}/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve renewal request');
      }

      toast.success('Renewal request approved successfully', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#10B981',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
        },
      });

      // Refresh both users and pending renewals
      fetchUsers();
      fetchPendingRenewals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve renewal request', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          padding: '16px',
          borderRadius: '8px',
        },
      });
    }
  };

  const renderRenewalsTab = () => (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Renewal Requests</h3>
        {isLoadingRenewals ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : pendingRenewals.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No pending renewal requests</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested On</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingRenewals.map((request) => (
                  <tr key={request.requestId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.userName}</div>
                          <div className="text-sm text-gray-500">{request.userEmail}</div>
                          <div className="text-sm text-gray-500">{request.userPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 capitalize">{request.plan}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 capitalize">{request.paymentMethod}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">₹{request.amount}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => approveRenewalRequest(request.userId, request.requestId)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
        <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Users className="text-blue-500" />
              <span className="text-lg font-semibold">Total Members</span>
            </div>
            <p className="text-3xl font-bold mt-2">{users.length}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500" />
              <span className="text-lg font-semibold">Active Members</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {users.filter(u => u.paymentStatus === 'confirmed').length}
            </p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="text-yellow-500" />
              <span className="text-lg font-semibold">Pending Payments</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {users.filter(u => u.paymentStatus === 'pending').length}
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Users className="text-red-500" />
              <span className="text-lg font-semibold">Expired Members</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {users.filter(u => isSubscriptionExpired(u.endDate)).length}
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="text-purple-500" />
              <span className="text-lg font-semibold">Monthly Members</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {users.filter(u => u.plan === '1month').length}
            </p>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="text-indigo-500" />
              <span className="text-lg font-semibold">6 Months Members</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {users.filter(u => u.plan === '6month').length}
            </p>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="text-pink-500" />
              <span className="text-lg font-semibold">Yearly Members</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {users.filter(u => u.plan === 'yearly').length}
            </p>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="text-emerald-500" />
              <span className="text-lg font-semibold">Monthly Revenue ({new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear})</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {formatCurrency(calculateMonthlyRevenue(selectedMonth, selectedYear))}
            </p>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="text-amber-500" />
              <span className="text-lg font-semibold">Yearly Revenue ({selectedYear})</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {formatCurrency(calculateYearlyRevenue(selectedYear))}
            </p>
          </div>

          <div className="bg-teal-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="text-teal-500" />
              <span className="text-lg font-semibold">Total Revenue</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {formatCurrency(calculateTotalRevenue())}
            </p>
          </div>

          <div className="bg-green-100 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="text-green-700" />
              <span className="text-lg font-semibold">Cash Revenue ({new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear})</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {formatCurrency(calculateTotalCashRevenue(selectedMonth, selectedYear))}
            </p>
          </div>

          <div className="bg-blue-100 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="text-blue-700" />
              <span className="text-lg font-semibold">Online Revenue ({new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear})</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {formatCurrency(calculateTotalOnlineRevenue(selectedMonth, selectedYear))}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All Members
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Payments
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === 'renewals'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('renewals')}
          >
            Renewal Requests
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === 'expired'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('expired')}
          >
            Expired Members
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === '1month'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('1month')}
          >
            1 Month Members
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === '2month'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('2month')}
          >
            2 Months Members
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === '3month'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('3month')}
          >
            3 Months Members
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === '6month'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('6month')}
          >
            6 Months Members
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === 'yearly'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('yearly')}
          >
            Yearly Members
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
              activeTab === 'online-payment'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('online-payment')}
          >
            Online Payment Requests
          </button>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={fetchUsers}
            disabled={isRefreshing}
            className={`px-3 py-1.5 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 flex items-center ${
              isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw mr-1"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.75L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.75L21 16"/><path d="M21 21v-5h-5"/></svg>
            Refresh Data
              </>
            )}
          </button>
        </div>

        <div className="block md:hidden">
          <div className="space-y-4">
            {filteredUsers().map((user) => (
              <div 
                key={user._id} 
                className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                  user.paymentStatus === 'pending' ? 'border-yellow-400' : 'border-green-400'
                }`}
              >
                <div className="flex items-center mb-3">
                  <img
                    className="h-12 w-12 rounded-full object-cover mr-3"
                    src={getPhotoUrl(user.photo)}
                    alt={user.name}
                    onError={handleImageError}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{user.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Plan</p>
                    <p className="font-medium truncate">{user.plan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-medium truncate">{getPlanAmountDisplay(user.plan)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Method</p>
                    <p className="font-medium capitalize truncate">{user.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                      user.paymentStatus === 'confirmed' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.paymentStatus === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {user.paymentStatus === 'pending' && (
                    <button
                      onClick={() => approvePayment(user._id)}
                      disabled={loadingStates[user._id]}
                      className={`text-xs bg-green-500 text-white px-2 py-1 rounded flex items-center ${
                        loadingStates[user._id] ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {loadingStates[user._id] ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Approving...
                        </>
                      ) : (
                        <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                        </>
                      )}
                    </button>
                  )}
                  {isSubscriptionExpired(user.endDate) && (
                    <button
                      onClick={() => {
                        setSelectedUserForNotification(user);
                        setShowNotificationModal(true);
                      }}
                      className="text-xs bg-purple-500 text-white px-2 py-1 rounded flex items-center"
                    >
                      <Bell className="w-3 h-3 mr-1" />
                      Notify
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded flex items-center hover:bg-blue-600 transition-colors duration-200"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setIsEditing(true);
                    }}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded flex items-center"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMember(user._id)}
                    disabled={isDeleting[user._id]}
                    className={`text-xs bg-red-500 text-white px-2 py-1 rounded flex items-center ${
                      isDeleting[user._id] ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isDeleting[user._id] ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                    <Trash className="w-3 h-3 mr-1" />
                    Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan & Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membership Validity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers().map((user) => (
                <tr key={user._id} className={
                  user.paymentStatus === 'pending' ? 'bg-yellow-50' : ''
                }>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={getPhotoUrl(user.photo)}
                          alt={user.name}
                          onError={handleImageError}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.plan}</div>
                    <div className="text-sm text-gray-500">{getPlanAmountDisplay(user.plan)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.paymentMethod === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.paymentMethod === 'online' ? 'Online Payment' : 'Cash Payment'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.paymentStatus === 'confirmed' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.paymentStatus === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const today = new Date();
                      const endDate = new Date(user.endDate);
                      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      
                      if (daysLeft < 0) {
                        return (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Expired
                          </span>
                        );
                      } else if (daysLeft <= 7) {
                        return (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            {daysLeft} days left
                          </span>
                        );
                      } else {
                        return (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active ({daysLeft} days left)
                          </span>
                        );
                      }
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    {user.paymentStatus === 'pending' && (
                      <button
                        onClick={() => approvePayment(user._id)}
                        disabled={loadingStates[user._id]}
                        className={`text-green-600 hover:text-green-900 inline-flex items-center ${
                          loadingStates[user._id] ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {loadingStates[user._id] ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Approving...
                          </>
                        ) : (
                          <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve Payment
                          </>
                        )}
                      </button>
                    )}
                    {isSubscriptionExpired(user.endDate) && (
                      <button
                        onClick={() => {
                          setSelectedUserForNotification(user);
                          setShowNotificationModal(true);
                        }}
                        className="text-purple-600 hover:text-purple-900 inline-flex items-center"
                      >
                        <Bell className="w-4 h-4 mr-1" />
                        Notify Member
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center transition-colors duration-200"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setIsEditing(true);
                      }}
                      className="text-green-600 hover:text-green-900 inline-flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMember(user._id)}
                      disabled={isDeleting[user._id]}
                      className={`text-red-600 hover:text-red-900 inline-flex items-center ${
                        isDeleting[user._id] ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isDeleting[user._id] ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        <>
                      <Trash className="w-4 h-4 mr-1" />
                          Delete Member
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
        <h2 className="text-2xl font-bold mb-4">Revenue Breakdown</h2>

        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">Select Month</label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year-select" className="block text-sm font-medium text-gray-700">Select Year</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
            >
              {[...Array(11)].map((_, i) => {
                const year = currentYear - 5 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Monthly Revenue ({new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear})</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Monthly Revenue ({new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear})</span>
                <span className="font-bold">{formatCurrency(calculateMonthlyRevenue(selectedMonth, selectedYear))}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Yearly Revenue ({selectedYear})</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Yearly Revenue ({selectedYear})</span>
                <span className="font-bold">{formatCurrency(calculateYearlyRevenue(selectedYear))}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Revenue by Plan</h3>
          <div className="space-y-4">
            {Object.entries(calculateRevenueByPlan()).map(([plan, revenue]) => (
              <div key={plan} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium capitalize">{plan.replace('month', ' Month').replace('yearly', 'Year')}</span>
                  <span className="font-bold">{formatCurrency(revenue)}</span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ 
                      width: `${(revenue / calculateYearlyRevenue(selectedYear)) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-4 md:p-6 relative my-8 animate-fadeIn max-h-[90vh] overflow-y-auto flex flex-col">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 text-4xl font-bold hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
              aria-label="Close modal"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-4 md:mb-6 text-gray-800">Member Details</h2>
            
            <div className="flex justify-center mb-4">
              <div className="relative group w-32 h-32 md:w-48 md:h-48 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={getPhotoUrl(selectedUser.photo)}
                  alt={selectedUser.name}
                  className="w-full h-full object-cover rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onError={handleImageError}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-300 flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium">
                    View Full Size
                  </span>
                </div>
              </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 flex-grow overflow-y-auto pb-4">
              <div className="space-y-3 md:space-y-4 bg-gray-50 p-4 md:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="transform hover:scale-[1.02] transition-transform duration-200 bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-sm text-gray-600 font-medium">Name</label>
                    <p className="font-medium text-gray-800 mt-1 break-words">{selectedUser.name}</p>
                  </div>
                  <div className="transform hover:scale-[1.02] transition-transform duration-200 bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-sm text-gray-600 font-medium">Email</label>
                    <p className="font-medium text-gray-800 mt-1 break-words">{selectedUser.email}</p>
                  </div>
                  <div className="transform hover:scale-[1.02] transition-transform duration-200 bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-sm text-gray-600 font-medium">Phone</label>
                    <p className="font-medium text-gray-800 mt-1 break-words">{selectedUser.phone}</p>
                  </div>
                  <div className="transform hover:scale-[1.02] transition-transform duration-200 bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-sm text-gray-600 font-medium">Date of Birth</label>
                    <p className="font-medium text-gray-800 mt-1">
                      {selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4 bg-gray-50 p-4 md:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Membership Details
                </h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="transform hover:scale-[1.02] transition-transform duration-200 bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-sm text-gray-600 font-medium">Plan</label>
                    <p className="font-medium text-gray-800 mt-1 capitalize">{selectedUser.plan}</p>
                  </div>
                  <div className="transform hover:scale-[1.02] transition-transform duration-200 bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-sm text-gray-600 font-medium">Start Date</label>
                    <p className="font-medium text-gray-800 mt-1">{new Date(selectedUser.startDate).toLocaleDateString()}</p>
                  </div>
                  <div className="transform hover:scale-[1.02] transition-transform duration-200 bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-sm text-gray-600 font-medium">End Date</label>
                    <p className="font-medium text-gray-800 mt-1">{new Date(selectedUser.endDate).toLocaleDateString()}</p>
                  </div>
                  <div className="transform hover:scale-[1.02] transition-transform duration-200 bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-sm text-gray-600 font-medium">Payment Method</label>
                    <p className="font-medium text-gray-800 mt-1 capitalize">{selectedUser.paymentMethod}</p>
                  </div>
                  <div className="transform hover:scale-[1.02] transition-transform duration-200 bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-sm text-gray-600 font-medium">Payment Status</label>
                    <span
                      className={`inline-flex px-2 md:px-3 py-1 text-xs md:text-sm rounded-full mt-1 font-medium ${
                        selectedUser.paymentStatus === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {selectedUser.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => {
                  setEditingUser(selectedUser);
                  setIsEditing(true);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Member
              </button>
              {selectedUser.paymentStatus === 'pending' && (
                <button
                  onClick={() => {
                    approvePayment(selectedUser._id);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Payment
                </button>
              )}
              {isSubscriptionExpired(selectedUser.endDate) && (
                <button
                  onClick={() => {
                    setSelectedUserForNotification(selectedUser);
                    setShowNotificationModal(true);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Send Notification
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditing && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-4 md:p-6 relative">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingUser(null);
              }}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 text-4xl font-bold hover:scale-110 transition-transform duration-200"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-6">Edit Member</h2>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!editingUser) return;

              const form = e.currentTarget;
              const formData = new FormData(form);
              
              const updatedData = {
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                plan: formData.get('plan') as string,
                startDate: formData.get('startDate') as string,
                endDate: formData.get('endDate') as string
              };

              const token = localStorage.getItem('token');
              if (!token) {
                throw new Error('No authentication token found');
              }

              fetch(`${API_BASE_URL}/api/users/${editingUser._id}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error('Failed to update member');
                }
                return response.json();
              })
              .then(data => {
                if (data.status === 'success') {
                  setUsers(currentUsers => 
                    currentUsers.map(user => 
                      user._id === editingUser._id 
                        ? { ...user, ...updatedData } 
                        : user
                    )
                  );
                  toast.success('Member updated successfully');
                  setIsEditing(false);
                  setEditingUser(null);
                }
              })
              .catch(error => {
                toast.error(error.message || 'Failed to update member');
              });
            }} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingUser.name}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingUser.email}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingUser.phone}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plan</label>
                  <select
                    name="plan"
                    defaultValue={editingUser.plan}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  >
                    <option value="1month">1 Month</option>
                    <option value="2month">2 Months</option>
                    <option value="3month">3 Months</option>
                    <option value="6month">6 Months</option>
                    <option value="yearly">1 Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={editingUser.startDate.split('T')[0]}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={editingUser.endDate.split('T')[0]}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNotificationModal && selectedUserForNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-4 md:p-6 relative">
            <button
              onClick={() => {
                setShowNotificationModal(false);
                setSelectedUserForNotification(null);
              }}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              disabled={isNotifying}
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-6">Send Notification</h2>
            
            <div className="space-y-4">
              <p>
                Send a notification to <strong>{selectedUserForNotification.name}</strong> about their expired membership.
              </p>
              
              <div className="flex justify-end">
                <button
                  onClick={() => notifyExpiredMember(
                    selectedUserForNotification._id,
                    selectedUserForNotification.email,
                    selectedUserForNotification.name
                  )}
                  disabled={isNotifying}
                  className={`px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    isNotifying ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isNotifying ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </div>
                  ) : (
                    'Send Notification'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'renewals' && renderRenewalsTab()}
    </div>
  );
};

export default AdminPanel;