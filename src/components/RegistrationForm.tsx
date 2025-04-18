import React, { useState } from 'react';
import { addMonths } from 'date-fns';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../App';

interface FormData {
  name: string;
  email: string;
  phone: string;
  dob: string;
  photo: File | null;
  plan: '1month' | '2month' | '3month' | '6month' | 'yearly';
  startDate: string;
  endDate: string;
  paymentMethod: 'cash' | 'online';
  [key: string]: string | File | null;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  photo?: string;
  [key: string]: string | undefined;
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

const RegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    dob: '',
    photo: null,
    plan: '1month',
    startDate: new Date().toISOString().split('T')[0],
    endDate: addMonths(new Date(), 1).toISOString().split('T')[0],
    paymentMethod: 'online',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [photoPreview, setPhotoPreview] = useState<string>('https://res.cloudinary.com/dovjfipbt/image/upload/v1744948014/default-avatar');
  const [selectedPlan, setSelectedPlan] = useState<'1month' | '2month' | '3month' | '6month' | 'yearly'>('1month');
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileSize = file.size / (1024 * 1024); // Convert to MB
      if (fileSize > 2) {
        toast.error('Photo size must be less than 2MB');
        setErrors(prev => ({ ...prev, photo: 'Photo size must be less than 2MB' }));
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPG, JPEG, or PNG)');
        setErrors(prev => ({ ...prev, photo: 'Please upload a valid image file (JPG, JPEG, or PNG)' }));
        return;
      }

      setFormData({ ...formData, photo: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrors(prev => ({ ...prev, photo: undefined }));
    }
  };

  const handlePlanSelect = (plan: PlanOption) => {
    const startDate = new Date();
    const endDate = addMonths(startDate, plan.months);
    setSelectedPlan(plan.id);
    setFormData(prev => ({
      ...prev,
      plan: plan.id,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
        isValid = false;
      }
    }

    // Date of birth validation
    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
      isValid = false;
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }

      if (age < 5) {
        newErrors.dob = 'Member must be at least 5 years old to register';
        isValid = false;
      } else if (age > 100) {
        newErrors.dob = 'Please enter a valid date of birth';
        isValid = false;
      }
    }

    // Photo validation
    if (!formData.photo) {
      newErrors.photo = 'Please upload a photo';
      isValid = false;
    } else if (formData.photo instanceof File) {
      const fileSize = formData.photo.size / (1024 * 1024); // Convert to MB
      if (fileSize > 2) {
        newErrors.photo = 'Photo size must be less than 2MB';
        isValid = false;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(formData.photo.type)) {
        newErrors.photo = 'Please upload a valid image file (JPG, JPEG, or PNG)';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Add all form fields to FormData
      Object.keys(formData).forEach(key => {
        // Special handling for photo
        if (key === 'photo' && formData[key] instanceof File) {
          formDataToSend.append('photo', formData[key] as File);
        } else {
          formDataToSend.append(key, String(formData[key]));
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          if (data.message.includes('Email already exists')) {
            setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
            toast.error('This email is already registered. Please use a different email.');
            return;
          } else if (data.message.includes('phone')) {
            setErrors(prev => ({ ...prev, phone: 'This phone number is already registered' }));
            toast.error('This phone number is already registered. Please use a different phone number.');
            return;
          }
        }
        throw new Error(data.message || 'Registration failed. Please try again.');
      }

      toast.success('Registration successful! Please check your email.');
      navigate('/thank-you');
    } catch (error) {
      console.error('Error during registration:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Function to handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://res.cloudinary.com/dovjfipbt/image/upload/v1744948014/default-avatar';
    setImageError(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-white mb-8">Choose Your Plan</h2>
      
      {/* Price Selection Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Select Your Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handlePlanSelect(plan)}
              className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                selectedPlan === plan.id
                  ? 'bg-yellow-500 text-white shadow-lg'
                  : 'bg-white hover:bg-gray-50 shadow-md'
              }`}
            >
              <div className="text-lg font-bold mb-2">{plan.name}</div>
              <div className={`text-2xl font-bold ${
                selectedPlan === plan.id ? 'text-white' : 'text-yellow-500'
              }`}>
                {formatPrice(plan.price)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Registration Form */}
      <div className="bg-white rounded-xl shadow-2xl p-8 transform transition-all hover:scale-[1.01]">
        <h3 className="text-2xl font-bold mb-6 text-gray-800">Personal Information</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Name</label>
              <input
                type="text"
                className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-sm focus:ring-2 focus:ring-yellow-200 transition-all duration-200 ${
                  errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-yellow-500'
                }`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) {
                    setErrors({ ...errors, name: undefined });
                  }
                }}
                placeholder="Enter your full name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-sm focus:ring-2 focus:ring-yellow-200 transition-all duration-200 ${
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-yellow-500'
                }`}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
                placeholder="Enter your email"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Phone</label>
              <input
                type="tel"
                className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-sm focus:ring-2 focus:ring-yellow-200 transition-all duration-200 ${
                  errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-yellow-500'
                }`}
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) {
                    setErrors({ ...errors, phone: undefined });
                  }
                }}
                placeholder="Enter your phone number"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Date of Birth</label>
              <input
                type="date"
                className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-sm focus:ring-2 focus:ring-yellow-200 transition-all duration-200 ${
                  errors.dob ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-yellow-500'
                }`}
                value={formData.dob}
                onChange={(e) => {
                  setFormData({ ...formData, dob: e.target.value });
                  if (errors.dob) {
                    setErrors({ ...errors, dob: undefined });
                  }
                }}
              />
              {errors.dob && <p className="mt-1 text-sm text-red-600">{errors.dob}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">Photo</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className={`w-32 h-32 border-2 ${
                  errors.photo ? 'border-red-500' : 'border-gray-200'
                } border-dashed rounded-xl flex items-center justify-center transition-all duration-200 hover:border-yellow-500 ${
                  errors.photo ? 'bg-red-50' : ''
                }`}>
                  <img 
                    src={photoPreview} 
                    alt="Profile" 
                    className="w-full h-full object-cover rounded-lg"
                    onError={handleImageError}
                  />
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={(e) => {
                    handlePhotoChange(e);
                    if (errors.photo) {
                      setErrors({ ...errors, photo: undefined });
                    }
                    setImageError(false);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="text-sm text-gray-500">
                Click to upload or drag and drop<br />
                PNG, JPG up to 2MB
                {errors.photo && (
                  <p className="mt-1 text-red-600 font-medium">{errors.photo}</p>
                )}
                {imageError && !errors.photo && (
                  <p className="mt-1 text-yellow-600 font-medium">Using default avatar</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Payment Method</label>
              <select
                className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'cash' | 'online' })}
              >
                <option value="online">Online Payment</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                disabled
                className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                disabled
                className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm bg-gray-50"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-3 text-lg font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 ${
                isLoading 
                  ? 'opacity-50 cursor-not-allowed bg-yellow-500' 
                  : 'bg-yellow-500 hover:bg-yellow-600 hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </span>
              ) : (
                'Submit Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;