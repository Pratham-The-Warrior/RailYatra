import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
    onNavigate?: (page: 'home' | 'schedules' | 'live-status' | 'category-routes') => void;
    currentPage?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
        { label: 'Home', page: 'home' as const },
        { label: 'Schedules', page: 'schedules' as const },
        { label: 'Live Status', page: 'live-status' as const },
    ];

    const handleNav = (page: 'home' | 'schedules' | 'live-status') => {
        onNavigate?.(page);
        setMobileOpen(false);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                {/* Logo */}
                <div
                    className="flex items-center gap-2 group cursor-pointer"
                    onClick={() => handleNav('home')}
                >
                    <img
                        src="/logo2.png"
                        alt="RailYatra Logo"
                        className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-xl shadow-sm border border-slate-100 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                    />
                    <span className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 font-display group-hover:text-orange-500 transition-colors">RailYatra</span>
                </div>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navItems.map(item => (
                        <button
                            key={item.label}
                            onClick={() => handleNav(item.page)}
                            className={`text-sm font-medium transition-colors ${currentPage === item.page ? 'text-orange-500' : 'text-slate-800 hover:text-orange-500'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                    {['My Bookings', 'Alerts'].map((item) => (
                        <a
                            key={item}
                            href="#"
                            className="text-sm font-medium text-slate-800 hover:text-orange-500 transition-colors"
                        >
                            {item}
                        </a>
                    ))}
                    <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2 rounded-lg shadow-sm transition-colors">
                        Login
                    </button>
                </div>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="md:hidden bg-white border-t border-slate-100 shadow-lg overflow-hidden"
                    >
                        <div className="px-4 py-3 space-y-1">
                            {navItems.map(item => (
                                <button
                                    key={item.label}
                                    onClick={() => handleNav(item.page)}
                                    className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentPage === item.page
                                        ? 'text-orange-500 bg-orange-50'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                            {['My Bookings', 'Alerts'].map(item => (
                                <a
                                    key={item}
                                    href="#"
                                    className="block w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    {item}
                                </a>
                            ))}
                            <div className="pt-2 pb-1 px-3">
                                <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-sm transition-colors">
                                    Login
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};
