import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Home } from "@/pages/Home";
import { Schedules } from "@/pages/Schedules";
import { CategoryRoutes } from "@/pages/CategoryRoutes";
import { LiveStatus } from "@/pages/LiveStatus";

function App() {
    const [currentPage, setCurrentPage] = useState<'home' | 'schedules' | 'live-status' | 'category-routes'>('home');
    const [selectedTrain, setSelectedTrain] = useState<string | null>(null);
    const [category, setCategory] = useState<{ id: string; name: string }>({ id: '', name: '' });

    const handleNavigate = (
        page: 'home' | 'schedules' | 'live-status' | 'category-routes',
        trainNumber: string | null = null,
        categoryData?: { id: string; name: string }
    ) => {
        setSelectedTrain(trainNumber);
        if (categoryData) setCategory(categoryData);
        setCurrentPage(page);
    };

    return (
        <div className="min-h-screen bg-[#f3f6f4] selection:bg-orange-100 selection:text-orange-900 font-sans">
            <Navbar onNavigate={handleNavigate} currentPage={currentPage} />

            {currentPage === 'schedules' ? (
                <Schedules onNavigate={handleNavigate} initialTrainNumber={selectedTrain} />
            ) : currentPage === 'live-status' ? (
                <LiveStatus onNavigate={handleNavigate} initialTrainNumber={selectedTrain} />
            ) : currentPage === 'category-routes' ? (
                <CategoryRoutes
                    category={category.id}
                    categoryName={category.name}
                    onNavigate={handleNavigate}
                    onViewTrain={(num) => handleNavigate('schedules', num)}
                />
            ) : (
                <Home onNavigate={handleNavigate} />
            )}

            <Footer />
        </div>
    );
}

export default App;
