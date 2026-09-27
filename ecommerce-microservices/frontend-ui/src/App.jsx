import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Components
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';

// Pages
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import OrderHistory from './pages/OrderHistory';
import TrackPackage from './pages/TrackPackage';
import AdminDashboard from './pages/AdminDashboard';
import AdminAuth from './pages/AdminAuth';

// Admin only — redirects guests to /admin-auth, customers to /
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/admin-auth" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace state={{ forbidden: true }} />;
  return children;
};

// Login required — opens login modal and redirects home if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading, setShowLoginModal } = useAuth();
  if (loading) return null;
  if (!user) {
    setTimeout(() => setShowLoginModal(true), 0);
    return <Navigate to="/" replace />;
  }
  return children;
};

// Redirects admin users away from customer pages
const CustomerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user && user.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <LoginModal />
            <main className="flex-grow">
              <Routes>
                {/* Public / Customer Routes */}
                <Route path="/" element={<CustomerRoute><Home /></CustomerRoute>} />
                <Route path="/products" element={<CustomerRoute><ProductList /></CustomerRoute>} />
                <Route path="/product/:id" element={<CustomerRoute><ProductDetail /></CustomerRoute>} />

                {/* Protected Customer Routes — require login */}
                <Route path="/cart" element={<ProtectedRoute><CustomerRoute><Cart /></CustomerRoute></ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute><CustomerRoute><Wishlist /></CustomerRoute></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><CustomerRoute><OrderHistory /></CustomerRoute></ProtectedRoute>} />
                <Route path="/track/:orderId" element={<ProtectedRoute><CustomerRoute><TrackPackage /></CustomerRoute></ProtectedRoute>} />

                {/* Admin Routes — require admin role */}
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

                {/* Admin Auth page */}
                <Route path="/admin-auth" element={<AdminAuth />} />
              </Routes>
            </main>

            <footer className="bg-[#1a1a2e] border-t border-white/10 mt-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4 block">
                      My cart
                    </span>
                    <p className="text-gray-400 max-w-sm mt-4">
                      The premium destination for the finest products. Cloud-native microservices architecture powering a seamless shopping experience.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                    <ul className="space-y-2 text-gray-400">
                      <li><a href="/" className="hover:text-purple-400 transition-colors">Home</a></li>
                      <li><a href="/products" className="hover:text-purple-400 transition-colors">Shop All</a></li>
                      <li><a href="/cart" className="hover:text-purple-400 transition-colors">My Cart</a></li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-4">Support</h3>
                    <ul className="space-y-2 text-gray-400">
                      <li><a href="#" className="hover:text-purple-400 transition-colors">FAQ</a></li>
                      <li><a href="#" className="hover:text-purple-400 transition-colors">Shipping</a></li>
                      <li><a href="#" className="hover:text-purple-400 transition-colors">Returns</a></li>
                    </ul>
                  </div>
                </div>
                <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-500 text-sm">
                  &copy; 2024 My cart Platform. All rights reserved.
                </div>
              </div>
            </footer>
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'rgba(26, 26, 46, 0.95)',
                color: '#fff',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                backdropFilter: 'blur(16px)',
                padding: '24px 32px',
                fontSize: '1.25rem',
                fontWeight: '600',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(168, 85, 247, 0.4)',
                maxWidth: '600px'
              },
              success: {
                iconTheme: { primary: '#a855f7', secondary: '#fff' },
                duration: 4000
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
                duration: 5000
              }
            }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
