import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FiSearch, FiShoppingCart, FiHeart, FiUser, FiLogOut, FiMenu, FiX } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout, setShowLoginModal, requireAuth } = useAuth();
  const { cart } = useCart();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?q=${encodeURIComponent(search)}`);
  };

  const isCustomer = !user || user.role !== 'admin';

  return (
    <nav className="sticky top-0 z-40 bg-[#0f0f1a]/80 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
              S
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              My cart
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          {isCustomer && (
            <div className="hidden md:block flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search products, categories, brands..."
                  className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-5 pr-12 text-sm text-white focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all duration-300"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
                <button type="submit" className="absolute right-2 top-1.5 p-1.5 text-gray-400 hover:text-purple-400 transition-colors">
                  <FiSearch size={20} />
                </button>
              </form>
            </div>
          )}

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-6">
            {isCustomer && (
              <>
                <Link to="/products" className="nav-link text-sm">Shop</Link>
                {!user && (
                  <Link to="/admin-auth" className="text-gray-300 hover:text-blue-400 transition-colors text-sm font-medium">Seller Portal</Link>
                )}

                <button onClick={() => requireAuth(() => navigate('/wishlist'))} className="text-gray-300 hover:text-pink-400 transition-colors p-2">
                  <FiHeart size={22} />
                </button>

                <button onClick={() => requireAuth(() => navigate('/cart'))} className="text-gray-300 hover:text-purple-400 transition-colors p-2 relative group">
                  <FiShoppingCart size={22} className="group-hover:animate-cart-bounce" />
                  {cart?.count > 0 && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-pink-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                      {cart.count}
                    </span>
                  )}
                </button>
              </>
            )}

            {user ? (
              <div className="relative group/menu">
                <button className="flex items-center gap-2 text-gray-300 hover:text-white p-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold shadow-md">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                </button>
                <div className="absolute right-0 w-48 mt-2 py-2 bg-[#1a1a2e] rounded-xl border border-white/10 shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 transform origin-top-right group-hover/menu:scale-100 scale-95">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm text-white font-medium truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  {isCustomer && (
                    <Link to="/orders" className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Order History</Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-white/5 transition-colors font-medium">Admin Dashboard</Link>
                  )}
                  <button onClick={async () => { await logout(); window.location.href = '/'; }} className="w-full text-left px-4 py-2 text-sm text-pink-400 hover:text-pink-300 hover:bg-white/5 transition-colors flex items-center gap-2">
                    <FiLogOut /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="btn-primary py-2 px-5 text-sm">
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            {isCustomer && (
              <button onClick={() => requireAuth(() => navigate('/cart'))} className="text-gray-300 relative">
                <FiShoppingCart size={22} />
                {cart?.count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                    {cart.count}
                  </span>
                )}
              </button>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-300 p-2">
              {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#1a1a2e] p-4 absolute w-full animate-slide-up">
          {isCustomer && (
            <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false); }} className="mb-4">
              <input
                type="text" placeholder="Search..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-2 px-4 text-sm text-white"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </form>
          )}
          <div className="space-y-3 flex flex-col">
            {isCustomer && (
              <>
                <Link to="/products" className="text-gray-300 py-2 border-b border-white/5" onClick={() => setMenuOpen(false)}>Shop</Link>
                {!user && (
                  <Link to="/admin-auth" className="text-blue-400 py-2 border-b border-white/5 font-medium" onClick={() => setMenuOpen(false)}>Seller Portal</Link>
                )}
              </>
            )}
            {user ? (
              <>
                {isCustomer && (
                  <>
                    <Link to="/orders" className="text-gray-300 py-2 border-b border-white/5" onClick={() => setMenuOpen(false)}>Order History</Link>
                    <Link to="/wishlist" className="text-gray-300 py-2 border-b border-white/5" onClick={() => setMenuOpen(false)}>Wishlist</Link>
                  </>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-purple-400 py-2 border-b border-white/5" onClick={() => setMenuOpen(false)}>Admin Dashboard</Link>
                )}
                <button onClick={async () => { await logout(); window.location.href = '/'; setMenuOpen(false); }} className="text-pink-400 py-2 text-left">Sign Out</button>
              </>
            ) : (
              <button onClick={() => { setShowLoginModal(true); setMenuOpen(false); }} className="text-purple-400 py-2 text-left">Sign In</button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
