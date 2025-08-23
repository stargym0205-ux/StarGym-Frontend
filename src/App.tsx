import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Dumbbell, Calendar, CreditCard } from 'lucide-react';
import RegistrationForm from './components/RegistrationForm';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import ThankYou from './components/ThankYou';
import ThankYouPage from './components/ThankYouPage';
import RenewalForm from './components/RenewalForm';

// Define API base URL - make sure this matches your backend port
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://gym-backend-hz0n.onrender.com' 
  : 'http://localhost:3000';

// Create a separate NavBar component that uses useLocation
function NavBar({ isAdminLoggedIn, onLogout }: { isAdminLoggedIn: boolean; onLogout: () => void }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <nav className="bg-black bg-opacity-50 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Dumbbell className="text-yellow-500 animate-bounce" size={24} />
          <span className="text-white text-2xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300 cursor-default">
            Gold Gym
          </span>
        </div>
        {isAdminLoggedIn && isAdminRoute && (
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-400 transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-black bg-opacity-50 text-white py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="mr-2" size={20} /> Opening Hours
            </h3>
            <p>Monday - Saturday</p>
            <p>Morning: 6:00 AM - 9:00 AM</p>
            <p>Evening: 4:00 PM - 9:00 PM</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CreditCard className="mr-2" size={20} /> Payment Methods
            </h3>
            <p>Cash</p>
            <p>Online Payment</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <p>Email: admin@gmail.com</p>
            <p>Phone: 9101321032</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })
      .then(response => {
        if (response.ok) {
          setIsAdminLoggedIn(true);
        } else {
          localStorage.removeItem('token');
          setIsAdminLoggedIn(false);
        }
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setIsAdminLoggedIn(false);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAdminLoggedIn(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-white text-xl">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
        <Routes>
          <Route
            path="/admin"
            element={
              isAdminLoggedIn ? (
                <AdminPanel />
              ) : (
                <AdminLogin onLogin={() => setIsAdminLoggedIn(true)} />
              )
            }
          />
          <Route
            path="/"
            element={
              <>
                <NavBar isAdminLoggedIn={isAdminLoggedIn} onLogout={handleLogout} />
                <main className="container mx-auto px-4 py-8 flex-grow">
                  <RegistrationForm />
                </main>
                <Footer />
              </>
            }
          />
          <Route
            path="/thank-you"
            element={
              <>
                <NavBar isAdminLoggedIn={isAdminLoggedIn} onLogout={handleLogout} />
                <main className="container mx-auto px-4 py-8 flex-grow">
                  <ThankYou />
                </main>
                <Footer />
              </>
            }
          />
          <Route
            path="/renewal-thank-you"
            element={
              <>
                <NavBar isAdminLoggedIn={isAdminLoggedIn} onLogout={handleLogout} />
                <main className="container mx-auto px-4 py-8 flex-grow">
                  <ThankYouPage />
                </main>
                <Footer />
              </>
            }
          />
          <Route
            path="/renew-membership/:token"
            element={
              <>
                <NavBar isAdminLoggedIn={isAdminLoggedIn} onLogout={handleLogout} />
                <main className="container mx-auto px-4 py-8 flex-grow">
                  <RenewalForm />
                </main>
                <Footer />
              </>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;