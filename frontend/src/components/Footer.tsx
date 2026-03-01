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
                                src="/favicon.png"
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
                            <li><a href="#" className="hover:text-orange-400 transition-colors">PNR Status</a></li>
                            <li><a href="#" className="hover:text-orange-400 transition-colors">Seat Availability</a></li>
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
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span>All systems operational</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
