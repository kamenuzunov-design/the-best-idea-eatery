import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Pantry from './pages/Pantry';
import AIAssistant from './pages/AIAssistant';
import SavedRecipes from './pages/SavedRecipes';
import Login from './pages/Login';
import ProfileSettings from './pages/ProfileSettings';
import AdminDashboard from './pages/AdminDashboard';
import RecipeDetail from './pages/RecipeDetail';
import RecipeCustomization from './pages/RecipeCustomization';
import WinePairing from './pages/WinePairing';
import CookingMode from './pages/CookingMode';
import CookingProgress from './pages/CookingProgress';
import IngredientScanner from './pages/IngredientScanner';
import AIIngredientsSearch from './pages/AIIngredientsSearch';
import WeeklyMenuPlanner from './pages/WeeklyMenuPlanner';
import SeasonalMenu from './pages/SeasonalMenu';
import CuisinesExplorer from './pages/CuisinesExplorer';
import GourmetCommunity from './pages/GourmetCommunity';
import GourmetEvents from './pages/GourmetEvents';
import OrderHistory from './pages/OrderHistory';
import { useAuth } from './context/AuthContext';

// Guard component for routes requiring specific roles
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If role is required and user's role doesn't match
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl border-x border-primary/10">
        {user && <Header />}
        
        <Routes>
          {/* Public / Login */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          
          <Route path="/pantry" element={
            <ProtectedRoute allowedRoles={[0, 1]}>
              <Pantry />
            </ProtectedRoute>
          } />
          
          <Route path="/ai-assistant" element={
            <ProtectedRoute>
              <AIAssistant />
            </ProtectedRoute>
          } />
          
          <Route path="/saved" element={
            <ProtectedRoute>
              <SavedRecipes />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={[0]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Phase 6: Recipes */}
          <Route path="/recipe/:id" element={
            <ProtectedRoute>
              <RecipeDetail />
            </ProtectedRoute>
          } />
          <Route path="/recipe/:id/customize" element={
            <ProtectedRoute>
              <RecipeCustomization />
            </ProtectedRoute>
          } />
          <Route path="/recipe/:id/wine" element={
            <ProtectedRoute>
              <WinePairing />
            </ProtectedRoute>
          } />
          
          {/* Phase 7: Cooking */}
          <Route path="/recipe/:id/cooking" element={
            <ProtectedRoute>
              <CookingMode />
            </ProtectedRoute>
          } />
          <Route path="/profile/progress" element={
            <ProtectedRoute>
              <CookingProgress />
            </ProtectedRoute>
          } />

          {/* Phase 8: AI & Scanner */}
          <Route path="/scanner" element={
            <ProtectedRoute>
              <IngredientScanner />
            </ProtectedRoute>
          } />
          <Route path="/ai-search" element={
            <ProtectedRoute>
              <AIIngredientsSearch />
            </ProtectedRoute>
          } />

          {/* Phase 9: Planners */}
          <Route path="/planner" element={
            <ProtectedRoute>
              <WeeklyMenuPlanner />
            </ProtectedRoute>
          } />
          <Route path="/seasonal" element={
            <ProtectedRoute>
              <SeasonalMenu />
            </ProtectedRoute>
          } />
          <Route path="/cuisines" element={
            <ProtectedRoute>
              <CuisinesExplorer />
            </ProtectedRoute>
          } />

          {/* Phase 10: Social & Store */}
          <Route path="/community" element={
            <ProtectedRoute>
              <GourmetCommunity />
            </ProtectedRoute>
          } />
          <Route path="/events" element={
            <ProtectedRoute>
              <GourmetEvents />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {user && <Navigation />}
      </div>
    </Router>
  );
}

export default App;
