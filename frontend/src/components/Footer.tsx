import React from 'react';
import { Globe, Shield, Zap } from 'lucide-react';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-slate-900 pt-16 md:pt-20 pb-10 mt-16 md:mt-20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-16">
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-1 space-y-5">
                        <div className="flex items-center gap-2.5">
                            <img
                                src="/logo2.png"
                                alt="RailYatra Logo"
                                className="w-9 h-9 object-contain rounded-lg"
                            />
                            <span className="text-xl font-bold font-display">
                                <span className="text-white">Rail</span>
                                <span className="text-orange-400">Yatra</span>
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-[260px]">
                            Your one-stop destination for Indian Railways travel planning, tracking, and route optimization.
                        </p>
                        <div className="flex gap-3">
                            {[Globe, Shield, Zap].map((Icon, i) => (
                                <div key={i} className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 hover:text-orange-400 hover:border-orange-500/40 transition-all cursor-pointer">
                                    <Icon size={16} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-orange-400 text-xs uppercase tracking-widest mb-5">Quick Links</h4>
                        <ul className="space-y-3 text-sm text-slate-400 font-medium">
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Home</a></li>
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Train Schedule</a></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-bold text-orange-400 text-xs uppercase tracking-widest mb-5">Support</h4>
                        <ul className="space-y-3 text-sm text-slate-400 font-medium">
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Help Center</a></li>
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Refund Rules</a></li>
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Privacy Policy</a></li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div>
                        <h4 className="font-bold text-orange-400 text-xs uppercase tracking-widest mb-5">Connect</h4>
                        <ul className="space-y-3 text-sm text-slate-400 font-medium">
                            <li><a href="#" className="hover:text-orange-400 transition-colors">GitHub</a></li>
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Twitter / X</a></li>
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Contact Us</a></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-14 md:mt-16 pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                    <p>© 2026 RailYatra. All Rights Reserved.</p>

                    {/* Premium "Made by" badge */}
                    <a
                        href="https://www.linkedin.com/in/pratham-sarda-8a6a88318/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative"
                    >
                        {/* Animated gradient border */}
                        <span
                            className="absolute -inset-[1px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]"
                            style={{
                                background: 'conic-gradient(from var(--border-angle, 0deg), #f97316, #fb923c, #0A66C2, #38bdf8, #f97316)',
                                animation: 'border-spin 3s linear infinite',
                            }}
                        />
                        {/* Inner container */}
                        <span className="relative flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900 border border-slate-700/60 group-hover:border-transparent transition-all duration-500">
                            {/* "Developed by" text */}
                            <span className="text-[11px] tracking-wide text-slate-500 group-hover:text-slate-400 transition-colors duration-300 uppercase">
                                Developed by
                            </span>
                            {/* Name with shimmer */}
                            <span className="relative font-bold text-[13px] tracking-tight">
                                <span
                                    className="bg-clip-text text-transparent"
                                    style={{
                                        backgroundImage: 'linear-gradient(90deg, #f97316, #fb923c, #fff, #fb923c, #f97316)',
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer 3s ease-in-out infinite',
                                    }}
                                >
                                    Pratham&nbsp; Sarda
                                </span>
                            </span>
                            {/* Divider */}
                            <span className="w-px h-3.5 bg-slate-700 group-hover:bg-slate-600 transition-colors duration-300" />
                            {/* LinkedIn icon */}
                            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-800 group-hover:bg-[#0A66C2] transition-all duration-300 group-hover:shadow-[0_0_12px_rgba(10,102,194,0.4)]">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors duration-300"
                                >
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </span>
                        </span>
                    </a>

                    <span className="text-slate-600">v1.0 · RailYatra</span>
                </div>

                {/* Keyframe animations for the credit badge */}
                <style>{`
                    @property --border-angle {
                        syntax: '<angle>';
                        initial-value: 0deg;
                        inherits: false;
                    }
                    @keyframes border-spin {
                        to { --border-angle: 360deg; }
                    }
                    @keyframes shimmer {
                        0%, 100% { background-position: -100% 0; }
                        50% { background-position: 200% 0; }
                    }
                `}</style>
            </div>
        </footer>
    );
};
