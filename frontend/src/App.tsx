import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Home } from "@/pages/Home";
import { Schedules } from "@/pages/Schedules";
import { CategoryRoutes } from "@/pages/CategoryRoutes";
import { LiveStatus } from "@/pages/LiveStatus";
import { formatPath, parsePath, type Page, type View } from "@/routing";

function App() {
    // The URL is the source of truth, so links can be shared and Back/Forward work.
    const [view, setView] = useState<View>(() => parsePath(window.location.pathname));

    useEffect(() => {
        const onPop = () => setView(parsePath(window.location.pathname));
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const handleNavigate = (
        page: Page,
        trainNumber: string | null = null,
        categoryData?: { id: string; name: string }
    ) => {
        const next: View = { page, trainNumber, category: categoryData ?? (page === 'category-routes' ? view.category : null) };
        const path = formatPath(next);
        if (path !== window.location.pathname) window.history.pushState(null, '', path);
        setView(next);
        window.scrollTo({ top: 0 });
    };

    // Keyed by URL: Back/Forward to another train remounts the page with that train.
    const key = formatPath(view);

    return (
        <div className="min-h-screen bg-[#f3f6f4] selection:bg-orange-100 selection:text-orange-900 font-sans">
            <Navbar onNavigate={handleNavigate} currentPage={view.page} />

            {view.page === 'schedules' ? (
                <Schedules key={key} onNavigate={handleNavigate} initialTrainNumber={view.trainNumber} />
            ) : view.page === 'live-status' ? (
                <LiveStatus key={key} onNavigate={handleNavigate} initialTrainNumber={view.trainNumber} />
            ) : view.page === 'category-routes' && view.category ? (
                <CategoryRoutes
                    key={key}
                    category={view.category.id}
                    categoryName={view.category.name}
                    onNavigate={handleNavigate}
                    onViewTrain={(num) => handleNavigate('schedules', num)}
                />
            ) : (
                <Home onNavigate={handleNavigate} />
            )}

            <Footer onNavigate={(page) => handleNavigate(page)} />
        </div>
    );
}

export default App;
