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
import EditProfile from './pages/EditProfile';
import AdminDashboard from './pages/AdminDashboard';
import ActivityLog from './pages/admin/ActivityLog';
import ManageUsers from './pages/admin/ManageUsers';
import ManageMeasurements from './pages/admin/ManageMeasurements';
import Moderation from './pages/admin/Moderation';
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
import { useAuth, ROLES } from './context/AuthContext';

// Guard component for routes requiring specific roles
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  // If route has specific allowed roles and user's role is not in them
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user is guest, redirect to login. Otherwise, redirect to home.
    if (user.role === ROLES.GUEST) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { user } = useAuth();
  
  // Define commonly used role arrays
  const requiresLogin = [ROLES.USER, ROLES.SUPERUSER, ROLES.ADMIN];

  return (
    <Router>
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl border-x border-primary/10">
        <Header />
        
        <Routes>
          {/* Public / Login */}
          <Route path="/login" element={user.role === ROLES.GUEST ? <Login /> : <Navigate to="/" replace />} />
          
          {/* Public Routes (Accessible by GUEST) */}
          <Route path="/" element={<Home />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/recipe/:id/customize" element={<RecipeCustomization />} />
          <Route path="/recipe/:id/wine" element={<WinePairing />} />
          <Route path="/recipe/:id/cooking" element={<CookingMode />} />
          <Route path="/ai-search" element={<AIIngredientsSearch />} />
          <Route path="/cuisines" element={<CuisinesExplorer />} />
          <Route path="/community" element={<GourmetCommunity />} />
          <Route path="/events" element={<GourmetEvents />} />
          <Route path="/seasonal" element={<SeasonalMenu />} />
          
          {/* Protected Routes (Require Login) */}
          <Route path="/pantry" element={
            <ProtectedRoute allowedRoles={requiresLogin}>
              <Pantry />
            </ProtectedRoute>
          } />
          
          <Route path="/saved" element={
            <ProtectedRoute allowedRoles={requiresLogin}>
              <SavedRecipes />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={requiresLogin}>
              <ProfileSettings />
            </ProtectedRoute>
          } />
          
          <Route path="/profile/edit" element={
            <ProtectedRoute allowedRoles={requiresLogin}>
              <EditProfile />
            </ProtectedRoute>
          } />
          
          <Route path="/profile/progress" element={
            <ProtectedRoute allowedRoles={requiresLogin}>
              <CookingProgress />
            </ProtectedRoute>
          } />
          
          <Route path="/scanner" element={
            <ProtectedRoute allowedRoles={requiresLogin}>
              <IngredientScanner />
            </ProtectedRoute>
          } />
          
          <Route path="/planner" element={
            <ProtectedRoute allowedRoles={requiresLogin}>
              <WeeklyMenuPlanner />
            </ProtectedRoute>
          } />
          
          <Route path="/orders" element={
            <ProtectedRoute allowedRoles={requiresLogin}>
              <OrderHistory />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/moderation" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERUSER]}>
              <Moderation />
            </ProtectedRoute>
          } />
          <Route path="/admin/measurements" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERUSER]}>
              <ManageMeasurements />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <ManageUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/activity" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <ActivityLog />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Navigation />
      </div>
    </Router>
  );
}

export default App;
