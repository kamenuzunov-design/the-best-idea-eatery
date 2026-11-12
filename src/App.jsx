import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import RouteLoadingSpinner from './components/RouteLoadingSpinner';
import GDPRConsent from './components/GDPRConsent';
import AdBanner from './components/AdBanner';
import ScrollToTop from './components/ScrollToTop';
import { useAuth } from './context/AuthContext';
import { ROLES } from './constants/roles';

// Core entry pages (Lazy Loaded)
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));

// User & Feature Pages (Lazy Loaded)
const Pantry = lazy(() => import('./pages/Pantry'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const SavedRecipes = lazy(() => import('./pages/SavedRecipes'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const RecipeDetail = lazy(() => import('./pages/RecipeDetail'));
const RecipeCustomization = lazy(() => import('./pages/RecipeCustomization'));
const WinePairing = lazy(() => import('./pages/WinePairing'));
const CookingMode = lazy(() => import('./pages/CookingMode'));
const CookingProgress = lazy(() => import('./pages/CookingProgress'));
const IngredientScanner = lazy(() => import('./pages/IngredientScanner'));
const AIIngredientsSearch = lazy(() => import('./pages/AIIngredientsSearch'));
const RecipeSearchResults = lazy(() => import('./pages/RecipeSearchResults'));
const WeeklyMenuPlanner = lazy(() => import('./pages/WeeklyMenuPlanner'));
const DietaryProfileEdit = lazy(() => import('./pages/DietaryProfileEdit'));
const SeasonalMenu = lazy(() => import('./pages/SeasonalMenu'));
const CuisinesExplorer = lazy(() => import('./pages/CuisinesExplorer'));
const GourmetCommunity = lazy(() => import('./pages/GourmetCommunity'));
const GourmetEvents = lazy(() => import('./pages/GourmetEvents'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const AdvertiseInfo = lazy(() => import('./pages/AdvertiseInfo'));

// Admin Pages (Lazy Loaded - only fetched when admin logs in and navigates)
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ActivityLog = lazy(() => import('./pages/admin/ActivityLog'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'));
const ManageMeasurements = lazy(() => import('./pages/admin/ManageMeasurements'));
const ManageIngredients = lazy(() => import('./pages/admin/ManageIngredients'));
const ManageRecipes = lazy(() => import('./pages/admin/ManageRecipes'));
const ManageIngredientGroups = lazy(() => import('./pages/admin/ManageIngredientGroups'));
const ManageCuisines = lazy(() => import('./pages/admin/ManageCuisines'));
const DataDashboard = lazy(() => import('./pages/admin/DataDashboard'));
const Moderation = lazy(() => import('./pages/admin/Moderation'));
const BackupRecovery = lazy(() => import('./pages/admin/BackupRecovery'));
const ManageAds = lazy(() => import('./pages/admin/ManageAds'));
const ManageAIConfig = lazy(() => import('./pages/admin/ManageAIConfig'));
const ManageEvents = lazy(() => import('./pages/admin/ManageEvents'));

function App() {
  const { user } = useAuth();
  
  // Define commonly used role arrays
  const requiresLogin = [ROLES.USER, ROLES.MODERATOR, ROLES.ADMIN, ROLES.OWNER];

  return (
    <Router>
      <ScrollToTop />
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl border-x border-primary/10 pb-24">
        <GDPRConsent />
        <Header />
        
        <Suspense fallback={<RouteLoadingSpinner />}>
          <Routes>
            {/* Public / Login */}
            <Route path="/login" element={user.role === ROLES.GUEST ? <Login /> : <Navigate to="/" replace />} />
            
            {/* Public Routes (Accessible by GUEST) */}
            <Route path="/" element={<Home />} />
            <Route path="/advertise" element={<AdvertiseInfo />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/recipe/:id/customize" element={<RecipeCustomization />} />
            <Route path="/recipe/:id/wine" element={<WinePairing />} />
            <Route path="/recipe/:id/cooking" element={<CookingMode />} />
            <Route path="/search" element={<RecipeSearchResults />} />
            <Route path="/ai-search" element={<AIIngredientsSearch />} />
            <Route path="/cuisines" element={<CuisinesExplorer />} />
            <Route path="/community" element={
              <ProtectedRoute allowedRoles={requiresLogin}>
                <GourmetCommunity />
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute allowedRoles={requiresLogin}>
                <GourmetEvents />
              </ProtectedRoute>
            } />
            <Route path="/seasonal" element={<SeasonalMenu />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            
            {/* Protected Routes (Require Login) */}
            <Route path="/pantry" element={
              <ProtectedRoute allowedRoles={requiresLogin}>
                <Pantry />
              </ProtectedRoute>
            } />
            <Route path="/pantry/diet" element={
              <ProtectedRoute allowedRoles={requiresLogin}>
                <DietaryProfileEdit />
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
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.MODERATOR]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/data" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.MODERATOR, ROLES.USER]}>
                <DataDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/moderation" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.MODERATOR]}>
                <Moderation />
              </ProtectedRoute>
            } />
            <Route path="/admin/measurements" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER]}>
                <ManageMeasurements />
              </ProtectedRoute>
            } />
            <Route path="/admin/ingredients" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.MODERATOR]}>
                <ManageIngredients />
              </ProtectedRoute>
            } />
            <Route path="/admin/ingredient-groups" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER]}>
                <ManageIngredientGroups />
              </ProtectedRoute>
            } />
            <Route path="/admin/cuisines" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER]}>
                <ManageCuisines />
              </ProtectedRoute>
            } />
            <Route path="/admin/recipes" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.MODERATOR, ROLES.USER]}>
                <ManageRecipes />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.MODERATOR]}>
                <ManageUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/activity" element={
              <ProtectedRoute allowedRoles={[ROLES.OWNER]}>
                <ActivityLog />
              </ProtectedRoute>
            } />
            <Route path="/admin/activity-log" element={
              <ProtectedRoute allowedRoles={[ROLES.OWNER]}>
                <ActivityLog />
              </ProtectedRoute>
            } />
            <Route path="/admin/backup" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER]}>
                <BackupRecovery />
              </ProtectedRoute>
            } />
            <Route path="/admin/ads" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER]}>
                <ManageAds />
              </ProtectedRoute>
            } />
            <Route path="/admin/ai-config" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER]}>
                <ManageAIConfig />
              </ProtectedRoute>
            } />
            <Route path="/admin/events" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.MODERATOR]}>
                <ManageEvents />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        <AdBanner />
        <Navigation />
      </div>
    </Router>
  );
}

export default App;
