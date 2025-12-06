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
  gender: 'Male' | 'Female' | 'Other' | '';
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
  gender?: string;
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

  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return formatDate(new Date()); // Return today's date if invalid
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to parse date string to Date object
  const parseDate = (dateString: string): Date => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date(); // Return today's date if parsing fails
    }
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    gender: '',
    photo: null,
    plan: '1month',
    startDate: formatDate(new Date()),
    endDate: formatDate(addMonths(new Date(), 1)),
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
      if (fileSize > 10) {
        toast.error('Photo size must be less than 10MB');
        setErrors(prev => ({ ...prev, photo: 'Photo size must be less than 10MB' }));
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
    try {
      const startDate = parseDate(formData.startDate);
      if (!isNaN(startDate.getTime())) {
        const endDate = addMonths(startDate, plan.months);
        setSelectedPlan(plan.id);
        setFormData(prev => ({
          ...prev,
          plan: plan.id,
          endDate: formatDate(endDate)
        }));
      } else {
        toast.error('Please select a valid start date');
      }
    } catch (error) {
      console.error('Error handling plan selection:', error);
      toast.error('Please select a valid start date');
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    try {
      const selectedPlanOption = plans.find(plan => plan.id === selectedPlan);
      if (selectedPlanOption) {
        const startDate = parseDate(newStartDate);
        if (!isNaN(startDate.getTime())) {
          const endDate = addMonths(startDate, selectedPlanOption.months);
          setFormData(prev => ({
            ...prev,
            startDate: newStartDate,
            endDate: formatDate(endDate)
          }));
        } else {
          toast.error('Please select a valid start date');
        }
      }
    } catch (error) {
      console.error('Error handling start date change:', error);
      toast.error('Please select a valid start date');
    }
  };

  const validateForm = (): boolean => {
    console.log('validateForm started');
    const newErrors: FormErrors = {};
    let isValid = true;

    // Name validation
    console.log('Validating name...');
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
      console.log('Name validation failed');
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
      isValid = false;
      console.log('Name validation failed: too short');
    }

    // Email validation
    console.log('Validating email...');
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
      console.log('Email validation failed');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
        isValid = false;
        console.log('Email validation failed: invalid format');
      }
    }

    // Phone validation
    console.log('Validating phone...');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
      console.log('Phone validation failed');
    } else {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
        isValid = false;
        console.log('Phone validation failed: invalid format');
      }
    }

    // Gender validation
    console.log('Validating gender...');
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
      isValid = false;
      console.log('Gender validation failed');
    }

    // Photo validation
    console.log('Validating photo (if uploaded)...');
    if (formData.photo instanceof File) {
      console.log('Photo is a File, checking size and type...');
      const fileSize = formData.photo.size / (1024 * 1024); // Convert to MB
      if (fileSize > 10) {
        newErrors.photo = 'Photo size must be less than 10MB';
        isValid = false;
        console.log('Photo validation failed: size');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(formData.photo.type)) {
        newErrors.photo = 'Please upload a valid image file (JPG, JPEG, or PNG)';
        isValid = false;
        console.log('Photo validation failed: type');
      }
    }

    setErrors(newErrors);
    console.log('validateForm finished, isValid:', isValid, 'errors:', newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('handleSubmit started');
    e.preventDefault();
    
    // Validate form before submission
    console.log('Calling validateForm...');
    if (!validateForm()) {
      console.log('validateForm returned false, showing toast');
      toast.error('Please fix the errors in the form');
      console.log('handleSubmit stopping due to validation errors');
      return;
    }
    
    console.log('Validation successful, proceeding with submission');
    setIsLoading(true);
    console.log('isLoading set to true');
    
    try {
      console.log('Creating FormData object');
      const formDataToSend = new FormData();
      
      // Add all form fields to FormData
      console.log('Appending form data to FormData object');
      Object.keys(formData).forEach(key => {
        // Special handling for photo
        if (key === 'photo' && formData[key] instanceof File) {
          formDataToSend.append('photo', formData[key] as File);
          console.log(`Appended photo: ${key}`);
        } else {
          formDataToSend.append(key, String(formData[key]));
          console.log(`Appended field: ${key}`);
        }
      });

      console.log('Making fetch request to API');
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        body: formDataToSend,
      });

      console.log('Received response from API', response);
      const data = await response.json();
      console.log('Received data from API', data);

      if (!response.ok) {
        console.log('API response not ok', response.status, data);
        // Handle specific error cases
        if (response.status === 400) {
          if (data.field === 'email') {
            setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
            toast.error('This email is already registered. Please use a different email.');
            return;
          } else if (data.field === 'phone') {
            setErrors(prev => ({ ...prev, phone: 'This phone number is already registered' }));
            toast.error('This phone number is already registered. Please use a different phone number.');
            return;
          }
        }
        throw new Error(data.message || 'Registration failed. Please try again.');
      }

      const userId = data.data?.user?._id || data.data?.user?.id;

      // If online payment, create payment and redirect to payment page
      if (formData.paymentMethod === 'online' && userId) {
        try {
          console.log('Creating payment for online payment method');
          const selectedPlanOption = plans.find(plan => plan.id === formData.plan);
          const paymentResponse = await fetch(`${API_BASE_URL}/api/payments/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userId,
              plan: formData.plan,
              amount: selectedPlanOption?.price
            }),
          });

          const paymentData = await paymentResponse.json();

          if (!paymentResponse.ok || paymentData.status !== 'success') {
            throw new Error(paymentData.message || 'Failed to create payment');
          }

          // Store payment data in localStorage for the payment page
          localStorage.setItem(`payment_${paymentData.data.orderId}`, JSON.stringify(paymentData.data));

          toast.success('Registration successful! Please complete your payment.');
          navigate(`/payment/${paymentData.data.orderId}`);
          return;
        } catch (paymentError) {
          console.error('Error creating payment:', paymentError);
          toast.error('Registration successful but payment setup failed. Please contact admin.');
          // Still navigate to thank you page as registration was successful
          navigate('/thank-you');
          return;
        }
      }

      // For cash payment, go directly to thank you page
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
      <h2 className="text-3xl font-bold text-center accent-text mb-8">Choose Your Plan</h2>
      
      {/* Price Selection Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Select Your Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handlePlanSelect(plan)}
              className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 focus:ring-2 focus:ring-yellow-300 focus:outline-none ${
                selectedPlan === plan.id
                  ? 'bg-yellow-500 text-black shadow-lg'
                  : 'panel-card hover:bg-gray-50'
              }`}
            >
              <div className="text-lg font-bold mb-2">{plan.name}</div>
              <div className={`text-2xl font-bold ${
                selectedPlan === plan.id ? 'text-black' : 'text-yellow-500'
              }`}>
                {formatPrice(plan.price)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Registration Form */}
      <div className="panel-card p-8 transform transition-all hover:scale-[1.01]">
        <h3 className="text-2xl font-bold mb-6 text-gray-800">Personal Information</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Name</label>
              <input
                type="text"
                className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-sm focus:ring-2 focus:ring-yellow-300 transition-all duration-200 ${
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
                className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-sm focus:ring-2 focus:ring-yellow-300 transition-all duration-200 ${
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
                className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-sm focus:ring-2 focus:ring-yellow-300 transition-all duration-200 ${
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
              <label className="block text-sm font-semibold text-gray-700">Gender</label>
              <select
                className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-300 transition-all duration-200"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' | 'Other' | '' })}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
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
                PNG, JPG up to 10MB
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
                className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-300 transition-all duration-200"
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
                onChange={handleStartDateChange}
                className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm focus:border-yellow-500 focus:ring-2 focus:ring-yellow-300 transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                disabled // Keep end date disabled as it's auto-calculated
                className="mt-1 block w-full px-4 py-3 rounded-lg border-2 border-gray-200 shadow-sm bg-gray-50"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-3 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 ${
                isLoading 
                  ? 'opacity-50 cursor-not-allowed btn-primary' 
                  : 'btn-primary hover:-translate-y-0.5'
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