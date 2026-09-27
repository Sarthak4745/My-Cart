import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiUser, FiBriefcase, FiKey } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export default function AdminAuth() {
  const { user, loginUser, registerAdminUser } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', adminSecretKey: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await loginUser(formData.email, formData.password);
        if (res.user.role !== 'admin') {
          toast.error('Unauthorized. Please use the customer login.');
          // If they somehow logged in as user here, redirect to home
          navigate('/');
        } else {
          toast.success('Welcome to Seller Portal!');
          navigate('/admin');
        }
      } else {
        await registerAdminUser(formData); // formData includes adminSecretKey
        toast.success('Seller Account created successfully!');
        navigate('/admin');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0f1c] pt-20">
      <div className="glass-card w-full max-w-lg p-10 relative animate-bounce-in border-blue-500/30 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
            <FiBriefcase size={32} />
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {isLogin ? 'Seller Portal Login' : 'Register as Seller'}
        </h2>
        <p className="text-gray-400 text-center mb-10">
          {isLogin ? 'Sign in to manage your products and orders' : 'Join My cart as a merchant and start selling'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {!isLogin && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <FiUser />
              </div>
              <input
                type="text" required placeholder="Full Name / Store Name"
                className="input-field pl-11 py-3"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <FiMail />
            </div>
            <input
              type="email" required placeholder="Email Address"
              className="input-field pl-11 py-3"
              value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <FiLock />
            </div>
            <input
              type="password" required placeholder="Password"
              className="input-field pl-11 py-3"
              value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {/* Admin Secret Key — only shown during registration */}
          {!isLogin && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <FiKey />
              </div>
              <input
                type="password" required placeholder="Admin Secret Key"
                className="input-field pl-11 py-3 border-blue-500/40 focus:border-blue-400"
                value={formData.adminSecretKey}
                onChange={e => setFormData({ ...formData, adminSecretKey: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1 pl-1">Contact the platform owner for the registration key.</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Processing...' : (isLogin ? 'Access Dashboard' : 'Create Seller Account')}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400 z-10 relative">
          {isLogin ? "Want to sell on My cart? " : "Already a seller? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            {isLogin ? 'Register now' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
