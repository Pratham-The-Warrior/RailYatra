import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Home } from "@/pages/Home";
import { Schedules } from "@/pages/Schedules";

function App() {
    const [currentPage, setCurrentPage] = useState<'home' | 'schedules'>('home');

    return (
        <div className="min-h-screen bg-[#f3f6f4] selection:bg-orange-100 selection:text-orange-900 font-sans">
            <Navbar onNavigate={setCurrentPage} currentPage={currentPage} />

            {currentPage === 'schedules' ? (
                <Schedules onNavigate={setCurrentPage} />
            ) : (
                <Home onNavigate={setCurrentPage} />
            )}

            <Footer />
        </div>
    );
}

export default App;
