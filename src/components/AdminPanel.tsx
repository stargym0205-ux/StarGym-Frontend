import React, { useState, useEffect } from 'react';
import { Users, Calendar, CreditCard, CheckCircle, Eye, Edit, Trash, Bell, LayoutDashboard, RefreshCw, BarChart2, Settings, Menu, X, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../App';
import { useNavigate } from 'react-router-dom';

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
  subscriptionStatus: string;
  originalJoinDate?: string; // Store the original joining date
  monthlyRevenue?: {
    month: number;
    year: number;
    amount: number;
    isRenewal: boolean;
    plan: string;
    startDate: string;
  }[];
  renewals?: {
    plan: string;
    startDate: string;
    endDate: string;
    paymentMethod: string;
    renewedAt?: string;
    previousAmount: number;
    newAmount: number;
    previousPlan?: string;
  }[];
}

interface MembershipEntry {
  type: 'join' | 'renewal';
  date: string;
  duration: string;
  amount: number;
  paymentMode: string;
  plan: string;
  paymentStatus: string;
  transactionId?: string;
  notes?: string;
  userId: string;
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('members');
  const [selectedUserForNotification, setSelectedUserForNotification] = useState<User | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const [activeSidebarSection, setActiveSidebarSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [membershipEntries, setMembershipEntries] = useState<MembershipEntry[]>([]);
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();

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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Load confirmed membership history entries for all users
  useEffect(() => {
    const loadAllMembershipEntries = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const allEntries: MembershipEntry[] = [];
        await Promise.all(
          users.map(async (u) => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/users/${u._id}/membership-history`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              if (!res.ok) return;
              const data = await res.json();
              const entries = (data?.data?.membershipHistory || []) as any[];
              entries.forEach((e) => {
                if (e && e.paymentStatus === 'confirmed') {
                  allEntries.push({ ...e, userId: u._id });
                }
              });
            } catch (_) {
              // ignore per-user fetch errors
            }
          })
        );
        setMembershipEntries(allEntries);
      } catch (_) {
        // ignore
      }
    };
    if (users.length > 0) {
      loadAllMembershipEntries();
    } else {
      setMembershipEntries([]);
    }
  }, [users]);

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
        return filtered; // Show all members including expired ones
    }
  };

  const isSubscriptionExpired = (endDate: string | Date) => {
    return new Date(endDate) < new Date();
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
    return membershipEntries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month && e.paymentStatus === 'confirmed';
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const calculateMonthlyRevenueBreakdown = (year: number) => {
    const monthlyRevenue: Record<string, number> = {};
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Calculate revenue for each month
    months.forEach((month, index) => {
      monthlyRevenue[month] = calculateMonthlyRevenue(index, year);
    });

    return monthlyRevenue;
  };

  const calculateYearlyRevenue = (year: number) => {
    return membershipEntries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === year && e.paymentStatus === 'confirmed';
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const calculateRevenueByPlan = () => {
    const planRevenue: Record<string, number> = {
      '1month': 0,
      '2month': 0,
      '3month': 0,
      '6month': 0,
      'yearly': 0
    };
    membershipEntries
      .filter((e) => e.paymentStatus === 'confirmed')
      .forEach((e) => {
        planRevenue[e.plan] = (planRevenue[e.plan] || 0) + (e.amount || 0);
      });
    return planRevenue;
  };

  const calculateTotalCashRevenue = (month: number, year: number) => {
    return membershipEntries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month && e.paymentStatus === 'confirmed' && e.paymentMode === 'cash';
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const calculateTotalOnlineRevenue = (month: number, year: number) => {
    return membershipEntries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month && e.paymentStatus === 'confirmed' && e.paymentMode === 'online';
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPhotoUrl = (photo: string) => {
    if (!photo) return 'https://res.cloudinary.com/dovjfipbt/image/upload/v1744948014/default-avatar';
    if (photo.startsWith('http')) return photo;
    return `https://res.cloudinary.com/dovjfipbt/image/upload/${photo}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://res.cloudinary.com/dovjfipbt/image/upload/v1744948014/default-avatar';
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

  const getExpiringThisWeek = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return users.filter(user => {
      const endDate = new Date(user.endDate);
      return endDate >= today && endDate <= nextWeek;
    }).length;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin');
    window.location.reload();
  };

  const UserViewModal: React.FC<{ user: User | null; onClose: () => void }> = ({ user, onClose }) => {
    if (!user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 animate-fadeIn overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl p-3 sm:p-6 max-w-4xl w-[95%] sm:w-full mx-auto my-2 sm:my-8 transform transition-all duration-300 animate-slideIn">
          <div className="flex justify-between items-center mb-3 sm:mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              </div>
              <h2 className="text-base sm:text-xl font-bold text-gray-800">Member Details</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>
          
          {/* Mobile Photo Section */}
          <div className="md:hidden mb-4 sm:mb-6">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 sm:border-4 border-yellow-100 shadow-lg">
                <img
                  src={getPhotoUrl(user.photo)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
              <div className="mt-3 sm:mt-4 text-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">{user.name}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8">
            {/* Desktop Photo Section */}
            <div className="hidden md:flex flex-col items-center flex-shrink-0">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden border-4 border-yellow-100 shadow-lg transform hover:scale-105 transition-transform duration-300">
                <img
                  src={getPhotoUrl(user.photo)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            
            <div className="flex-grow">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-sm sm:text-base text-gray-900 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {user.phone}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="mt-1 text-sm sm:text-base text-gray-900 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(user.dob).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Membership Plan</label>
                    <p className="mt-1 text-sm sm:text-base text-gray-900 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {user.plan}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <label className="block text-xs sm:text-sm font-medium text-gray-500">Amount</label>
                    <p className="mt-1 text-sm sm:text-base text-gray-900 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {getPlanAmountDisplay(user.plan)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <label className="block text-xs sm:text-sm font-medium text-gray-500">Payment Method</label>
              <div className="mt-1 flex items-center">
                <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                  user.paymentMethod === 'online' 
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {user.paymentMethod === 'online' ? 'Online Payment' : 'Cash Payment'}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <label className="block text-xs sm:text-sm font-medium text-gray-500">Payment Status</label>
              <div className="mt-1">
                <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                  user.paymentStatus === 'confirmed' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.paymentStatus === 'confirmed' ? 'Confirmed' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <label className="block text-xs sm:text-sm font-medium text-gray-500">Start Date</label>
              <p className="mt-1 text-sm sm:text-base text-gray-900 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(user.startDate).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <label className="block text-xs sm:text-sm font-medium text-gray-500">End Date</label>
              <p className="mt-1 text-sm sm:text-base text-gray-900 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(user.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {user.renewals && user.renewals.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Subscription History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Previous Plan</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">New Plan</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Start Date</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">End Date</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Payment Method</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Previous Amount</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">New Amount</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Renewed At</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {user.renewals.map((renewal, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {renewal.previousPlan}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            {renewal.plan}
                          </span>
                        </td>
                        <td className="px-3 py-2">{new Date(renewal.startDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2">{new Date(renewal.endDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2 capitalize">{renewal.paymentMethod}</td>
                        <td className="px-3 py-2">₹{renewal.previousAmount.toLocaleString()}</td>
                        <td className="px-3 py-2">₹{renewal.newAmount.toLocaleString()}</td>
                        <td className="px-3 py-2">{renewal.renewedAt ? new Date(renewal.renewedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const EditUserModal: React.FC<{ user: User | null; onClose: () => void; onSave: (updatedUser: User) => void }> = ({ user, onClose, onSave }) => {
    const [editedUser, setEditedUser] = useState<User | null>(user);
    const [isSaving, setIsSaving] = useState(false);

    if (!editedUser) return null;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        const response = await fetch(`${API_BASE_URL}/api/users/${editedUser._id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editedUser)
        });

        if (!response.ok) throw new Error('Failed to update user');

        const data = await response.json();
        if (data.status === 'success') {
          onSave(editedUser);
          toast.success('User updated successfully!');
          onClose();
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to update user');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md sm:max-w-2xl mx-2 my-4 sm:mx-4 sm:my-8 shadow-xl overflow-y-auto max-h-screen">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Edit Member</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editedUser.name}
                  onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                  className="mt-1 block w-full min-w-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-base"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editedUser.email}
                  onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                  className="mt-1 block w-full min-w-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-base"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={editedUser.phone}
                  onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                  className="mt-1 block w-full min-w-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-base"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700">Plan</label>
                <select
                  value={editedUser.plan}
                  onChange={(e) => setEditedUser({ ...editedUser, plan: e.target.value })}
                  className="mt-1 block w-full min-w-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-base"
                >
                  <option value="1month">1 Month</option>
                  <option value="2month">2 Months</option>
                  <option value="3month">3 Months</option>
                  <option value="6month">6 Months</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                <select
                  value={editedUser.paymentStatus}
                  onChange={(e) => setEditedUser({ ...editedUser, paymentStatus: e.target.value })}
                  className="mt-1 block w-full min-w-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-base"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={editedUser.paymentMethod}
                  onChange={(e) => setEditedUser({ ...editedUser, paymentMethod: e.target.value })}
                  className="mt-1 block w-full min-w-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-base"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={editedUser.startDate ? editedUser.startDate.slice(0, 10) : ''}
                  onChange={e => setEditedUser({ ...editedUser, startDate: e.target.value })}
                  className="mt-1 block w-full min-w-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-base"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={editedUser.endDate ? editedUser.endDate.slice(0, 10) : ''}
                  onChange={e => setEditedUser({ ...editedUser, endDate: e.target.value })}
                  className="mt-1 block w-full min-w-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 text-base"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 sm:mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 w-full sm:w-auto flex items-center gap-2 ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleRenewalApproval = async (userId: string) => {
    if (!window.confirm('Are you sure you want to approve this renewal?')) {
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
        throw new Error('Failed to approve renewal');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        const user = users.find(u => u._id === userId);
        const amount = user ? getPlanAmount(user.plan) : 0;
        setUsers(users.map(user => 
          user._id === userId 
            ? { ...user, paymentStatus: 'confirmed', subscriptionStatus: 'active' } 
            : user
        ));
        toast.success(`Renewal approved successfully! Amount: ₹${amount.toLocaleString()}`, {
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
      toast.error(error.message || 'Failed to approve renewal', {
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

  const handleRenewalRejection = async (userId: string) => {
    if (!window.confirm('Are you sure you want to reject this renewal request?')) {
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, [userId]: true }));
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/reject-renewal/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reject renewal');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        setUsers(users.map(user => 
          user._id === userId 
            ? { ...user, subscriptionStatus: 'expired' } 
            : user
        ));
        toast.success('Renewal rejected successfully!', {
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
      toast.error(error.message || 'Failed to reject renewal', {
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

  // Revenue helpers removed; revenue is computed from confirmed membership history entries only

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200 border border-gray-200"
      >
        {isSidebarOpen ? (
          <X className="w-5 h-5 text-gray-700" />
        ) : (
          <Menu className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Sidebar */}
      <div 
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[260px] bg-white shadow-xl transform transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-[-110%]'
        } lg:translate-x-0 lg:w-64`}
        style={{ maxHeight: '100vh' }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {/* Dashboard Section */}
              <div>
                <button
                  onClick={() => {
                    setActiveSidebarSection('dashboard');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeSidebarSection === 'dashboard'
                      ? 'bg-yellow-50 text-yellow-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>
              </div>

              {/* Members Section */}
              <div>
                <button
                  onClick={() => {
                    setActiveSidebarSection('members');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeSidebarSection === 'members'
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Members</span>
                </button>
              </div>

              {/* Renewals Section */}
              <div>
                <button
                  onClick={() => {
                    setActiveSidebarSection('renewals');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeSidebarSection === 'renewals'
                      ? 'bg-purple-50 text-purple-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Renewals</span>
                </button>
              </div>

              {/* Revenue Section */}
              <div>
                <button
                  onClick={() => {
                    setActiveSidebarSection('revenue');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeSidebarSection === 'revenue'
                      ? 'bg-green-50 text-green-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <BarChart2 className="w-5 h-5" />
                  <span>Revenue</span>
                </button>
              </div>

              {/* Settings Section */}
              <div>
                <button
                  onClick={() => {
                    setActiveSidebarSection('settings');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeSidebarSection === 'settings'
                      ? 'bg-gray-50 text-gray-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </nav>
          <div className="p-4 border-t bg-white">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-yellow-500 text-white font-semibold shadow hover:bg-yellow-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8 lg:py-8">
          {activeSidebarSection === 'dashboard' && (
            <div className="bg-white rounded-lg shadow-xl p-0 md:p-0 w-full h-full min-h-[calc(100vh-4rem)] flex flex-col">
              <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Admin Dashboard</h2>
              <div className="flex-1 px-4 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 h-full">
                  {/* Total Members */}
                  <div className="group bg-blue-50 rounded-2xl shadow-md border border-blue-100 cursor-pointer flex flex-col justify-center items-center p-8 h-full w-full transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-blue-100/80 active:scale-100">
                    <Users className="text-blue-500 group-hover:text-blue-700 transition-colors duration-300 mb-2" size={40} />
                    <span className="text-lg font-semibold mb-1">Total Members</span>
                    <p className="text-4xl font-extrabold group-hover:text-blue-700 transition-colors duration-300">{users.length}</p>
                  </div>
                  {/* Active Members */}
                  <div className="group bg-green-50 rounded-2xl shadow-md border border-green-100 cursor-pointer flex flex-col justify-center items-center p-8 h-full w-full transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-green-100/80 active:scale-100">
                    <CheckCircle className="text-green-500 group-hover:text-green-700 transition-colors duration-300 mb-2" size={40} />
                    <span className="text-lg font-semibold mb-1">Active Members</span>
                    <p className="text-4xl font-extrabold group-hover:text-green-700 transition-colors duration-300">{users.filter(u => u.paymentStatus === 'confirmed').length}</p>
                  </div>
                  {/* Pending Payments */}
                  <div className="group bg-yellow-50 rounded-2xl shadow-md border border-yellow-100 cursor-pointer flex flex-col justify-center items-center p-8 h-full w-full transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-yellow-100/80 active:scale-100">
                    <CreditCard className="text-yellow-500 group-hover:text-yellow-700 transition-colors duration-300 mb-2" size={40} />
                    <span className="text-lg font-semibold mb-1">Pending Payments</span>
                    <p className="text-4xl font-extrabold group-hover:text-yellow-700 transition-colors duration-300">{users.filter(u => u.paymentStatus === 'pending').length}</p>
                  </div>
                  {/* Expired Members */}
                  <div className="group bg-red-50 rounded-2xl shadow-md border border-red-100 cursor-pointer flex flex-col justify-center items-center p-8 h-full w-full transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-red-100/80 active:scale-100">
                    <Users className="text-red-500 group-hover:text-red-700 transition-colors duration-300 mb-2" size={40} />
                    <span className="text-lg font-semibold mb-1">Expired Members</span>
                    <p className="text-4xl font-extrabold group-hover:text-red-700 transition-colors duration-300">{users.filter(u => isSubscriptionExpired(u.endDate)).length}</p>
                  </div>
                  {/* Monthly Members */}
                  <div className="group bg-purple-50 rounded-2xl shadow-md border border-purple-100 cursor-pointer flex flex-col justify-center items-center p-8 h-full w-full transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-purple-100/80 active:scale-100">
                    <Calendar className="text-purple-500 group-hover:text-purple-700 transition-colors duration-300 mb-2" size={40} />
                    <span className="text-lg font-semibold mb-1">Monthly Members</span>
                    <p className="text-4xl font-extrabold group-hover:text-purple-700 transition-colors duration-300">{users.filter(u => u.plan === '1month').length}</p>
                  </div>
                  {/* 6 Months Members */}
                  <div className="group bg-indigo-50 rounded-2xl shadow-md border border-indigo-100 cursor-pointer flex flex-col justify-center items-center p-8 h-full w-full transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-indigo-100/80 active:scale-100">
                    <Calendar className="text-indigo-500 group-hover:text-indigo-700 transition-colors duration-300 mb-2" size={40} />
                    <span className="text-lg font-semibold mb-1">6 Months Members</span>
                    <p className="text-4xl font-extrabold group-hover:text-indigo-700 transition-colors duration-300">{users.filter(u => u.plan === '6month').length}</p>
                  </div>
                  {/* Yearly Members */}
                  <div className="group bg-pink-50 rounded-2xl shadow-md border border-pink-100 cursor-pointer flex flex-col justify-center items-center p-8 h-full w-full transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-pink-100/80 active:scale-100">
                    <Calendar className="text-pink-500 group-hover:text-pink-700 transition-colors duration-300 mb-2" size={40} />
                    <span className="text-lg font-semibold mb-1">Yearly Members</span>
                    <p className="text-4xl font-extrabold group-hover:text-pink-700 transition-colors duration-300">{users.filter(u => u.plan === 'yearly').length}</p>
                  </div>
                  {/* Expiring This Week */}
                  <div className="group bg-orange-50 rounded-2xl shadow-md border border-orange-100 cursor-pointer flex flex-col justify-center items-center p-8 h-full w-full transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:bg-orange-100/80 active:scale-100">
                    <Calendar className="text-orange-500 group-hover:text-orange-700 transition-colors duration-300 mb-2" size={40} />
                    <span className="text-lg font-semibold mb-1">Expiring This Week</span>
                    <p className="text-4xl font-extrabold group-hover:text-orange-700 transition-colors duration-300">{getExpiringThisWeek()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Monthly Revenue Breakdown - {selectedYear}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(calculateMonthlyRevenueBreakdown(selectedYear)).map(([month, revenue]) => (
                    <div key={month} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-800">{month}</h4>
                        <CreditCard className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">
                        {formatCurrency(revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSidebarSection === 'members' && (
            <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
              <h2 className="text-2xl font-bold mb-6 accent-text">Members Management</h2>
              {/* Search Bar */}
              <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full sm:w-80 px-4 py-2 rounded-lg border-2 border-gray-200 shadow-sm focus:ring-2 focus:ring-yellow-300 focus:border-yellow-500 transition-all"
                />
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
              </div>

              <div className="flex justify-end mb-4">
                <button
                  onClick={fetchUsers}
                  disabled={isRefreshing}
                  className={`px-3 py-1.5 text-sm rounded-md btn-primary flex items-center ${
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
                            className={`text-xs btn-primary px-2 py-1 rounded flex items-center gap-2 ${
                              loadingStates[user._id] ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {loadingStates[user._id] && (
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            {loadingStates[user._id] ? 'Approving...' : 'Approve'}
                          </button>
                        )}
                        {isSubscriptionExpired(user.endDate) && (
                          <button
                            onClick={() => {
                              setSelectedUserForNotification(user);
                              setShowNotificationModal(true);
                            }}
                            disabled={isNotifying && selectedUserForNotification?._id === user._id}
                            className={`text-xs bg-purple-500 text-white px-2 py-1 rounded flex items-center gap-2 ${
                              isNotifying && selectedUserForNotification?._id === user._id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {isNotifying && selectedUserForNotification?._id === user._id && (
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            {isNotifying && selectedUserForNotification?._id === user._id ? 'Notifying...' : 'Notify'}
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-xs btn-primary px-2 py-1 rounded flex items-center transition-colors duration-200"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setIsEditing(true);
                          }}
                          className="text-xs btn-primary px-2 py-1 rounded flex items-center"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMember(user._id)}
                          disabled={isDeleting[user._id]}
                          className={`text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center gap-2 transition-colors duration-200 ${
                            isDeleting[user._id] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isDeleting[user._id] && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {isDeleting[user._id] ? 'Deleting...' : 'Delete'}
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
                                <Loader2 className="w-4 h-4 animate-spin" />
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
                            className="text-yellow-600 hover:text-yellow-900 inline-flex items-center"
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
          )}

          {activeSidebarSection === 'renewals' && (
            <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Renewal Requests</h2>
                <button
                  onClick={fetchUsers}
                  disabled={isRefreshing}
                  className={`flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 ${
                    isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isRefreshing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
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
                        Current Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users
                      .filter(user => user.subscriptionStatus === 'pending' && user.paymentStatus === 'pending')
                      .map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={user.photo || "https://res.cloudinary.com/dovjfipbt/image/upload/v1744948014/default-avatar"}
                                  alt={user.name}
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.plan.replace('month', ' Month').replace('yearly', ' Year')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {user.plan.replace('month', ' Month').replace('yearly', ' Year')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.endDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.startDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                            <button
                              onClick={() => handleRenewalApproval(user._id)}
                              disabled={loadingStates[user._id]}
                              className={`text-green-600 hover:text-green-900 inline-flex items-center ${
                                loadingStates[user._id] ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {loadingStates[user._id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve Renewal
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleRenewalRejection(user._id)}
                              disabled={loadingStates[user._id]}
                              className={`text-red-600 hover:text-red-900 inline-flex items-center ${
                                loadingStates[user._id] ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {loadingStates[user._id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash className="w-4 h-4 mr-1" />
                                  Reject Renewal
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {users.filter(user => user.subscriptionStatus === 'pending' && user.paymentStatus === 'pending').length === 0 && (
                <div className="mt-4 text-center text-gray-500">
                  No renewal requests found
                </div>
              )}
            </div>
          )}

          {activeSidebarSection === 'revenue' && (
            <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
              <h2 className="text-2xl font-bold mb-6">Revenue Analytics</h2>
              
              {/* Year and Month Selection */}
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

              {/* Revenue Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Monthly Revenue Card */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Monthly Revenue</h3>
                    <CreditCard className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(calculateMonthlyRevenue(selectedMonth, selectedYear))}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear}
                  </p>
                </div>

                {/* Yearly Revenue Card */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Yearly Revenue</h3>
                    <CreditCard className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(calculateYearlyRevenue(selectedYear))}
                  </p>
                  <p className="text-sm text-gray-500">
                    Total for {selectedYear}
                  </p>
                </div>

                {/* Cash Revenue Card */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Cash Revenue</h3>
                    <CreditCard className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(calculateTotalCashRevenue(selectedMonth, selectedYear))}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear}
                  </p>
                </div>

                {/* Online Revenue Card */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Online Revenue</h3>
                    <CreditCard className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(calculateTotalOnlineRevenue(selectedMonth, selectedYear))}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} {selectedYear}
                  </p>
                </div>
              </div>

              {/* Monthly Revenue Breakdown */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Monthly Revenue Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(calculateMonthlyRevenueBreakdown(selectedYear)).map(([month, revenue]) => (
                    <div key={month} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-800">{month}</h4>
                        <CreditCard className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">
                        {formatCurrency(revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Cash vs Online Revenue Breakdown */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Monthly Cash vs Online Revenue</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(calculateMonthlyRevenueBreakdown(selectedYear)).map(([month, _]) => {
                    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
                    const cashRevenue = calculateTotalCashRevenue(monthIndex, selectedYear);
                    const onlineRevenue = calculateTotalOnlineRevenue(monthIndex, selectedYear);
                    const totalRevenue = cashRevenue + onlineRevenue;

                    return (
                      <div key={month} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-800">{month}</h4>
                          <div className="flex space-x-2">
                            <CreditCard className="w-5 h-5 text-green-500" />
                            <CreditCard className="w-5 h-5 text-blue-500" />
                          </div>
                        </div>
                        
                        {/* Cash Revenue */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Cash Revenue</span>
                            <span className="text-sm font-medium text-gray-900">{formatCurrency(cashRevenue)}</span>
                          </div>
                        </div>

                        {/* Online Revenue */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Online Revenue</span>
                            <span className="text-sm font-medium text-gray-900">{formatCurrency(onlineRevenue)}</span>
                          </div>
                        </div>

                        {/* Total Monthly Revenue */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-800">Total Revenue</span>
                            <span className="text-lg font-bold text-gray-900">{formatCurrency(totalRevenue)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Revenue by Plan Type */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Revenue by Plan Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(calculateRevenueByPlan()).map(([plan, revenue]) => (
                    <div key={plan} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-800 capitalize">
                          {plan.replace('month', ' Month').replace('yearly', 'Year')}
                        </h4>
                        <CreditCard className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">
                        {formatCurrency(revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSidebarSection === 'settings' && (
            <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
              <h2 className="text-2xl font-bold mb-6">Settings</h2>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                  {/* Add settings content here */}
                </div>
          </div>
        </div>
      )}
                    </div>
              </div>
      
      {selectedUser && (
        <UserViewModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
      
      {isEditing && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => {
            setIsEditing(false);
            setEditingUser(null);
          }}
          onSave={(updatedUser) => {
            setUsers(users.map(u => u._id === updatedUser._id ? updatedUser : u));
            setIsEditing(false);
            setEditingUser(null);
          }}
        />
      )}
      {showNotificationModal && selectedUserForNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Send Expiry Notification</h2>
            <p className="mb-6 text-gray-700">
              Are you sure you want to notify <span className="font-semibold">{selectedUserForNotification.name}</span> ({selectedUserForNotification.email}) about their expired membership?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  notifyExpiredMember(
                    selectedUserForNotification._id,
                    selectedUserForNotification.email,
                    selectedUserForNotification.name
                  )
                }
                disabled={isNotifying}
                className={`px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 ${
                  isNotifying ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isNotifying && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isNotifying ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;