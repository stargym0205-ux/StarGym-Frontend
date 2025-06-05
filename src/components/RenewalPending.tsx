import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';

const RenewalPending: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <Clock className="h-16 w-16 text-yellow-500 animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Renewal Request Pending
        </h2>
        
        <p className="text-gray-600 mb-6">
          Your membership renewal request has been submitted successfully and is now pending admin approval. 
          You will receive an email notification once your request is approved.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors duration-200"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenewalPending; 