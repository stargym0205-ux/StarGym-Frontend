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

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | '1month' | '2month' | '3month' | '6month' | 'yearly' | 'expired' | 'online-payment'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedUserForNotification, setSelectedUserForNotification] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
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
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Function to check if subscription is expired
  const isSubscriptionExpired = (endDate: string) => {
    const today = new Date();
    const expiryDate = new Date(endDate);
    return today > expiryDate;
  };

  // Modified filteredUsers function to include expired
  const filteredUsers = () => {
    switch (activeTab) {
      case 'pending':
        return users.filter(user => user.paymentStatus === 'pending');
      case '1month':
        return users.filter(user => user.plan === '1month');
      case '2month':
        return users.filter(user => user.plan === '2month');
      case '3month':
        return users.filter(user => user.plan === '3month');
      case '6month':
        return users.filter(user => user.plan === '6month');
      case 'yearly':
        return users.filter(user => user.plan === 'yearly');
      case 'expired':
        return users.filter(user => isSubscriptionExpired(user.endDate));
      case 'online-payment':
        return users.filter(user => user.paymentMethod === 'online' && user.paymentStatus === 'pending');
      default:
        return users;
    }
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
        toast.success('Payment approved successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve payment');
    }
  };

  const notifyExpiredMember = async (userId: string, userEmail: string, userName: string) => {
    try {
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
        toast.success('Notification sent successfully!');
        setShowNotificationModal(false);
        setSelectedUserForNotification(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send notification');
    }
  };

  // Add revenue calculation functions
  const calculateMonthlyRevenue = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return users
      .filter(user => {
        const userDate = new Date(user.startDate);
        return userDate.getMonth() === currentMonth && 
               userDate.getFullYear() === currentYear &&
               user.paymentStatus === 'confirmed';
      })
      .reduce((total, user) => total + getPlanAmount(user.plan), 0);
  };

  const calculateYearlyRevenue = () => {
    const currentYear = new Date().getFullYear();
    
    return users
      .filter(user => {
        const userDate = new Date(user.startDate);
        return userDate.getFullYear() === currentYear &&
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPhotoUrl = (photoPath: string | undefined) => {
    if (!photoPath) return '/default-avatar.png';
    
    if (photoPath.includes('gym-backend-hz0n.onrender.com')) {
      return photoPath;
    } else if (photoPath.includes('gym-backend-hz0n.onrender.com')) {
      return photoPath.replace(
        'https://gym-backend-hz0n.onrender.com',
        'https://gym-backend-hz0n.onrender.com'
      );
    }
    
    // If it's just a path (starts with /uploads), append it to API_BASE_URL
    if (photoPath.startsWith('/uploads/')) {
      return `${API_BASE_URL}${photoPath}`;
    }
    
    // For default avatar
    if (photoPath === '/default-avatar.png') {
      return `${API_BASE_URL}${photoPath}`;
    }
    
    // If it's already a full URL with the correct domain, return as is
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    
    // For any other case, assume it's a relative path and append to API_BASE_URL
    return `${API_BASE_URL}/${photoPath.replace(/^\/+/, '')}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-8 gap-4 mb-8">
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
              <span className="text-lg font-semibold">Monthly Revenue</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {formatCurrency(calculateMonthlyRevenue())}
            </p>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <CreditCard className="text-amber-500" />
              <span className="text-lg font-semibold">Yearly Revenue</span>
            </div>
            <p className="text-3xl font-bold mt-2">
              {formatCurrency(calculateYearlyRevenue())}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === 'all'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All Members
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === 'pending'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Payments
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === '1month'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('1month')}
          >
            Monthly Members
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === '2month'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('2month')}
          >
            2 Months Members
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === '3month'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('3month')}
          >
            3 Months Members
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === '6month'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('6month')}
          >
            6 Months Members
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === 'yearly'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('yearly')}
          >
            Yearly Members
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === 'expired'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('expired')}
          >
            Expired Members
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              activeTab === 'online-payment'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('online-payment')}
          >
            Online Payment Requests
          </button>
        </div>

        <div className="overflow-x-auto">
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
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== '/default-avatar.png') {
                              console.error('Failed to load image:', user.photo);
                              target.src = '/default-avatar.png';
                            }
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
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
                        className="text-green-600 hover:text-green-900 inline-flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve Payment
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
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center"
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
                      onClick={() => {
                        if (!window.confirm('Are you sure you want to delete this member?')) {
                          return;
                        }

                        const token = localStorage.getItem('token');
                        if (!token) {
                          throw new Error('No authentication token found');
                        }

                        fetch(`${API_BASE_URL}/api/users/${user._id}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        })
                        .then(response => {
                          if (!response.ok) {
                            throw new Error('Failed to delete member');
                          }
                          setUsers(currentUsers => currentUsers.filter(u => u._id !== user._id));
                          toast.success('Member deleted successfully');
                        })
                        .catch(error => {
                          toast.error(error.message || 'Failed to delete member');
                        });
                      }}
                      className="text-red-600 hover:text-red-900 inline-flex items-center"
                    >
                      <Trash className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Breakdown Section */}
      <div className="bg-white rounded-lg shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-6">Revenue Breakdown</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Revenue Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Monthly Revenue</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-bold">{formatCurrency(calculateMonthlyRevenue())}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
          </div>

          {/* Yearly Revenue Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Yearly Revenue</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-bold">{formatCurrency(calculateYearlyRevenue())}</span>
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

        {/* Plan-wise Revenue Breakdown */}
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
                      width: `${(revenue / calculateYearlyRevenue()) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6 relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>

            <h2 className="text-2xl font-bold mb-6">Member Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo */}
              <div className="md:col-span-2 flex justify-center">
                <img
                  src={getPhotoUrl(selectedUser.photo)}
                  alt={selectedUser.name}
                  className="w-32 h-32 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/default-avatar.png') {
                      console.error('Failed to load image:', selectedUser.photo);
                      target.src = '/default-avatar.png';
                    }
                  }}
                />
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div>
                  <label className="block text-sm text-gray-600">Name</label>
                  <p className="font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Email</label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Phone</label>
                  <p className="font-medium">{selectedUser.phone}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Date of Birth</label>
                  <p className="font-medium">
                    {selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Membership Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Membership Details</h3>
                <div>
                  <label className="block text-sm text-gray-600">Plan</label>
                  <p className="font-medium capitalize">{selectedUser.plan}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Start Date</label>
                  <p className="font-medium">{new Date(selectedUser.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">End Date</label>
                  <p className="font-medium">{new Date(selectedUser.endDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Payment Method</label>
                  <p className="font-medium capitalize">{selectedUser.paymentMethod}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Payment Status</label>
                  <span
                    className={`inline-flex px-2 py-1 text-sm rounded-full ${
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
        </div>
      )}

      {isEditing && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6 relative">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingUser(null);
              }}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
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
                  throw new Error('Failed to update user');
                }
                setUsers(users.map(user => 
                  user._id === editingUser._id ? { ...user, ...updatedData } : user
                ));
                setIsEditing(false);
                setEditingUser(null);
                toast.success('User updated successfully!');
              })
              .catch(error => {
                toast.error(error.message || 'Failed to update user');
              });
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Confirmation Modal */}
      {showNotificationModal && selectedUserForNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6 relative">
            <button
              onClick={() => {
                setShowNotificationModal(false);
                setSelectedUserForNotification(null);
              }}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>

            <div className="text-center">
              <Bell className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Send Expiration Notification</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to send a notification to{' '}
                <span className="font-semibold">{selectedUserForNotification.name}</span>?
                This will send an email to {selectedUserForNotification.email} about their expired membership.
              </p>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setSelectedUserForNotification(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => notifyExpiredMember(
                    selectedUserForNotification._id,
                    selectedUserForNotification.email,
                    selectedUserForNotification.name
                  )}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                >
                  Send Notification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;