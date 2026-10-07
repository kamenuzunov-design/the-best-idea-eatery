import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getRemoteAIConfig, 
  saveRemoteAIConfig, 
  fetchAvailableModelsFromGoogle, 
  testGeminiModel,
  getGeminiApiKey,
  setGeminiApiKey,
  PRIMARY_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  KNOWN_GEMINI_MODELS,
  DEFAULT_AVAILABLE_MODELS
} from '../../lib/geminiClient';

const ManageAIConfig = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [currentConfig, setCurrentConfig] = useState(null);

  // Soft list of active / starred models
  const [softModels, setSoftModels] = useState(DEFAULT_AVAILABLE_MODELS);

  const [primaryModel, setPrimaryModel] = useState(PRIMARY_GEMINI_MODEL);
  const [fallbackModel, setFallbackModel] = useState(FALLBACK_GEMINI_MODEL);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelId, setCustomModelId] = useState('');

  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [discoveredModels, setDiscoveredModels] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Helper to check if model is permanent shortcut
  const isPermanent = (modelId) => {
    return modelId === 'gemini-flash-latest' || modelId === 'gemini-pro-latest';
  };

  // Helper to get formatted readable title (e.g. Gemini 3.8 Flash)
  const getReadableName = (modelId) => {
    if (modelId === 'gemini-flash-latest') return 'Gemini Flash Latest';
    if (modelId === 'gemini-pro-latest') return 'Gemini Pro Latest';
    const known = KNOWN_GEMINI_MODELS.find(m => m.id === modelId);
    if (known) {
      return known.label.split('(')[0].trim();
    }
    const discovered = discoveredModels.find(m => m.id === modelId);
    if (discovered?.displayName && discovered.displayName !== modelId) {
      return discovered.displayName;
    }
    return modelId
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Helper to get technical subtitle with explanation for shortcuts
  const getTechnicalSubtitle = (modelId) => {
    if (modelId === 'gemini-flash-latest') return 'gemini-flash-latest · Най-нов Flash модел';
    if (modelId === 'gemini-pro-latest') return 'gemini-pro-latest · Най-нов Pro модел';
    return modelId;
  };

  // Helper to get human label for select dropdowns
  const getModelLabel = (modelId) => {
    if (modelId === 'gemini-flash-latest') return 'Gemini Flash Latest (Най-нов Flash модел)';
    if (modelId === 'gemini-pro-latest') return 'Gemini Pro Latest (Най-нов Pro модел)';
    const known = KNOWN_GEMINI_MODELS.find(m => m.id === modelId);
    if (known) return known.label;
    const discovered = discoveredModels.find(m => m.id === modelId);
    if (discovered?.displayName && discovered.displayName !== modelId) {
      return `${discovered.displayName} (${modelId})`;
    }
    return modelId;
  };

  // Load current remote configuration from Firestore on mount
  useEffect(() => {
    const load = async () => {
      setLoadingConfig(true);
      try {
        const config = await getRemoteAIConfig();
        setCurrentConfig(config);
        const pModel = config.primary_model || PRIMARY_GEMINI_MODEL;
        const fModel = config.fallback_model || FALLBACK_GEMINI_MODEL;
        const rawAvail = Array.isArray(config.available_models) ? config.available_models : DEFAULT_AVAILABLE_MODELS;

        // Ensure permanent shortcuts are always present and at the top
        const normAvail = [
          'gemini-flash-latest',
          'gemini-pro-latest',
          ...rawAvail.filter(id => id !== 'gemini-flash-latest' && id !== 'gemini-pro-latest')
        ];

        if (pModel && !normAvail.includes(pModel)) normAvail.push(pModel);
        if (fModel && !normAvail.includes(fModel)) normAvail.push(fModel);

        setSoftModels(normAvail);

        if (normAvail.includes(pModel)) {
          setPrimaryModel(pModel);
          setIsCustomModel(false);
        } else {
          setPrimaryModel('custom');
          setIsCustomModel(true);
          setCustomModelId(pModel);
        }

        setFallbackModel(fModel);
        if (config.api_key) {
          setApiKey(prev => prev || config.api_key);
        }
      } catch (err) {
        console.warn("Could not load AI config:", err.message);
      } finally {
        setLoadingConfig(false);
      }
    };
    load();
  }, []);

  const effectivePrimaryModel = isCustomModel ? customModelId.trim() : primaryModel;

  const handleSelectPrimary = (val) => {
    if (val === 'custom') {
      setIsCustomModel(true);
      setPrimaryModel('custom');
    } else {
      setIsCustomModel(false);
      setPrimaryModel(val);
      setCustomModelId('');
    }
    setTestResult(null);
    setSaveSuccess(false);
  };

  // Toggle star to add or remove a model from soft list
  const toggleStar = (modelId) => {
    if (isPermanent(modelId)) return;

    setSoftModels(prev => {
      if (prev.includes(modelId)) {
        const next = prev.filter(id => id !== modelId);
        if (primaryModel === modelId) {
          setPrimaryModel('gemini-flash-latest');
          setIsCustomModel(false);
          setCustomModelId('');
        }
        if (fallbackModel === modelId) {
          setFallbackModel('gemini-pro-latest');
        }
        return next;
      } else {
        return [...prev, modelId];
      }
    });
    setSaveSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!effectivePrimaryModel) {
      alert(t('ai_config.error_no_model'));
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      if (apiKey && apiKey.trim()) {
        setGeminiApiKey(apiKey.trim());
      }

      // Ensure permanent shortcuts and active selections are part of saved available models
      const finalAvailable = Array.from(new Set([
        'gemini-flash-latest',
        'gemini-pro-latest',
        ...softModels,
        effectivePrimaryModel,
        fallbackModel
      ])).filter(Boolean);

      setSoftModels(finalAvailable);

      const updated = await saveRemoteAIConfig({
        primary_model: effectivePrimaryModel,
        fallback_model: fallbackModel,
        available_models: finalAvailable,
        api_key: apiKey?.trim() || '',
        user
      });
      setCurrentConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      console.error("Error saving AI config:", err);
      alert(t('ai_config.error_saving') + ': ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscoverModels = async () => {
    const keyToUse = apiKey.trim() || getGeminiApiKey();
    if (!keyToUse) {
      alert(t('ai_config.error_key_required'));
      return;
    }

    setIsDiscovering(true);
    setDiscoveryError(null);
    try {
      const models = await fetchAvailableModelsFromGoogle(keyToUse);
      setDiscoveredModels(models);
      if (models.length === 0) {
        setDiscoveryError(t('ai_config.no_models_found'));
      }
    } catch (err) {
      setDiscoveryError(err.message || String(err));
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleTestModel = async () => {
    const keyToUse = apiKey.trim() || getGeminiApiKey();
    if (!keyToUse) {
      alert(t('ai_config.error_key_required'));
      return;
    }
    if (!effectivePrimaryModel) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testGeminiModel({
        apiKey: keyToUse,
        model: effectivePrimaryModel
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message || String(err)
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 text-slate-100 min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-surface-dark/95 backdrop-blur-md border-b border-primary/20 shadow-md">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/admin')} 
            className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
            title={t('common.buttons.back')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">psychology</span>
              {t('ai_config.title')}
            </h1>
            <p className="text-[11px] font-medium text-primary/70">{t('ai_config.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto w-full space-y-6">
        {/* Current Active Status Card */}
        <div className="bg-surface-dark/90 rounded-2xl p-5 border border-primary/25 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            {t('ai_config.current_status_title')}
          </h2>

          {loadingConfig ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
              <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
              {t('common.loading')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-background-dark/70 rounded-xl p-3 border border-primary/10">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('ai_config.active_primary_label')}</p>
                <p className="text-base font-extrabold text-primary mt-0.5 flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-sm text-emerald-400 shrink-0">check_circle</span>
                  <span className="truncate">{currentConfig?.primary_model || PRIMARY_GEMINI_MODEL}</span>
                </p>
              </div>

              <div className="bg-background-dark/70 rounded-xl p-3 border border-primary/10">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('ai_config.active_fallback_label')}</p>
                <p className="text-sm font-bold text-slate-300 mt-0.5 flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-sm text-amber-400 shrink-0">shield</span>
                  <span className="truncate">{currentConfig?.fallback_model || FALLBACK_GEMINI_MODEL}</span>
                </p>
              </div>

              {currentConfig?.updated_at && (
                <div className="md:col-span-2 text-[10px] text-slate-400 pt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">history</span>
                  <span>
                    {t('ai_config.last_updated_by', {
                      date: new Date(currentConfig.updated_at).toLocaleString(),
                      user: currentConfig.updated_by || 'admin'
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="bg-surface-dark/90 rounded-2xl p-5 border border-primary/20 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">tune</span>
              {t('ai_config.edit_heading')}
            </h3>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              Admin & Owner
            </span>
          </div>

          {/* Primary Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>{t('ai_config.primary_model_field')}</span>
              <span className="text-[10px] text-slate-400 font-normal">{t('ai_config.primary_model_hint')}</span>
            </label>
            <select
              value={isCustomModel ? 'custom' : primaryModel}
              onChange={(e) => handleSelectPrimary(e.target.value)}
              className="w-full h-11 bg-background-dark border border-primary/30 rounded-xl px-3.5 text-sm text-slate-100 focus:border-primary focus:outline-none transition-colors"
            >
              {softModels.map(id => (
                <option key={id} value={id}>
                  {getModelLabel(id)}
                </option>
              ))}
              <option value="custom">{t('ai_config.option_custom')}</option>
            </select>

            {isCustomModel && (
              <div className="pt-2 animate-in fade-in duration-200">
                <input
                  type="text"
                  value={customModelId}
                  onChange={(e) => {
                    setCustomModelId(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder={t('ai_config.custom_input_placeholder')}
                  className="w-full h-11 bg-background-dark border border-amber-500/50 rounded-xl px-3.5 text-sm text-amber-300 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <p className="text-[10px] text-amber-400/80 mt-1">
                  {t('ai_config.custom_input_hint')}
                </p>
              </div>
            )}
          </div>

          {/* Fallback Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>{t('ai_config.fallback_model_field')}</span>
              <span className="text-[10px] text-slate-400 font-normal">{t('ai_config.fallback_model_hint')}</span>
            </label>
            <select
              value={fallbackModel}
              onChange={(e) => {
                setFallbackModel(e.target.value);
                setSaveSuccess(false);
              }}
              className="w-full h-11 bg-background-dark border border-primary/30 rounded-xl px-3.5 text-sm text-slate-100 focus:border-primary focus:outline-none transition-colors"
            >
              {softModels.map(id => (
                <option key={id} value={id}>
                  {getModelLabel(id)}
                </option>
              ))}
            </select>
          </div>

          {/* Test Model Row */}
          <div className="bg-background-dark/50 p-3.5 rounded-xl border border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">bolt</span>
                {t('ai_config.test_section_title')}
              </p>
              <p className="text-[11px] text-slate-400">{t('ai_config.test_section_desc', { model: effectivePrimaryModel })}</p>
            </div>
            <button
              type="button"
              onClick={handleTestModel}
              disabled={isTesting || !effectivePrimaryModel}
              className="h-10 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
            >
              {isTesting ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                  {t('ai_config.testing_btn')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  {t('ai_config.test_btn')}
                </>
              )}
            </button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs animate-in fade-in duration-200 ${
              testResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                  <span>
                    {t('ai_config.test_success_msg', { 
                      ms: testResult.elapsedMs, 
                      model: testResult.modelUsed 
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400 text-base">error</span>
                  <span>{t('ai_config.test_error_msg', { error: testResult.error })}</span>
                </div>
              )}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-emerald-400">verified</span>
              <span>{t('ai_config.save_success_msg')}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving || !effectivePrimaryModel}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-extrabold rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                  {t('ai_config.saving_btn')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  {t('ai_config.save_btn')}
                </>
              )}
            </button>
          </div>
        </form>

        {/* SOFT LIST: Active System Models (⭐) - 3 Columns (Star | 3-Row Info | Delete) */}
        <div className="bg-surface-dark/90 rounded-2xl p-5 border border-primary/20 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base fill-current">star</span>
                {t('ai_config.soft_list_heading')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{t('ai_config.soft_list_desc')}</p>
            </div>
            <span className="text-[11px] font-extrabold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/25">
              {softModels.length}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {softModels.map(modelId => {
              const isPerm = isPermanent(modelId);
              const isPrimary = effectivePrimaryModel === modelId;
              const isFallback = fallbackModel === modelId;

              return (
                <div 
                  key={modelId}
                  className={`p-3.5 rounded-xl border transition-colors flex items-start gap-3 sm:gap-4 ${
                    isPrimary 
                      ? 'bg-primary/15 border-primary text-slate-100 shadow-sm'
                      : 'bg-background-dark/80 border-primary/15 hover:border-primary/30 text-slate-300'
                  }`}
                >
                  {/* КОЛОНА 1: Звездата */}
                  <div className="pt-0.5 shrink-0 flex items-center justify-center">
                    {isPerm ? (
                      <span 
                        className="text-amber-400 select-none p-1 block" 
                        title={t('ai_config.permanent_tooltip')}
                      >
                        <span className="material-symbols-outlined text-2xl fill-current text-amber-400">star</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleStar(modelId)}
                        className="text-amber-400 hover:text-amber-300 p-1 rounded-lg hover:bg-amber-400/10 transition-colors cursor-pointer"
                        title={t('ai_config.star_active_tooltip')}
                      >
                        <span className="material-symbols-outlined text-2xl fill-current text-amber-400">star</span>
                      </button>
                    )}
                  </div>

                  {/* КОЛОНА 2: Вътрешна структура с 3 реда */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Ред 1: Името на модела (БЕЗ етикети) */}
                    <div className="text-sm font-extrabold text-slate-100 tracking-wide truncate">
                      {getReadableName(modelId)}
                    </div>

                    {/* Ред 2: Техническото наименование и пояснение */}
                    <div className="text-xs font-mono text-slate-400 select-all truncate">
                      {getTechnicalSubtitle(modelId)}
                    </div>

                    {/* Ред 3: Статуси "Основен" и "Резервен" един до друг (само оцветяване, без избор) */}
                    <div className="flex items-center gap-2 pt-1 select-none">
                      <span
                        className={`px-3 py-1 text-xs rounded-lg border font-bold transition-all ${
                          isPrimary
                            ? 'bg-primary text-background-dark border-primary font-black shadow-sm'
                            : 'bg-background-dark/40 text-slate-500 border-slate-700/40 opacity-40'
                        }`}
                      >
                        {t('ai_config.badge_primary')}
                      </span>

                      <span
                        className={`px-3 py-1 text-xs rounded-lg border font-bold transition-all ${
                          isFallback
                            ? 'bg-amber-400 text-background-dark border-amber-400 font-black shadow-sm'
                            : 'bg-background-dark/40 text-slate-500 border-slate-700/40 opacity-40'
                        }`}
                      >
                        {t('ai_config.badge_fallback')}
                      </span>
                    </div>
                  </div>

                  {/* КОЛОНА 3: Бутон за премахване/изтриване */}
                  <div className="pt-0.5 shrink-0 flex items-center justify-center">
                    {isPerm ? (
                      <span 
                        className="p-1.5 text-slate-600 cursor-not-allowed select-none" 
                        title={t('ai_config.permanent_tooltip')}
                      >
                        <span className="material-symbols-outlined text-lg">lock</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleStar(modelId)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/15 transition-colors cursor-pointer"
                        title={t('ai_config.star_active_tooltip')}
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Discovery & Inspection Panel - 3 Columns (Star | 3-Row Info | Delete / Status) */}
        <div className="bg-surface-dark/90 rounded-2xl p-5 border border-primary/20 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">travel_explore</span>
                {t('ai_config.discovery_heading')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{t('ai_config.discovery_desc')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-300">
                {t('ai_config.api_key_label')}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 h-11 bg-background-dark border border-primary/25 rounded-xl px-3.5 text-sm text-slate-200 focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleDiscoverModels}
                  disabled={isDiscovering}
                  className="px-4 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                >
                  {isDiscovering ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                      {t('ai_config.discovering_btn')}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">search</span>
                      {t('ai_config.discover_btn')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {discoveryError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                ⚠️ {discoveryError}
              </p>
            )}

            {discoveredModels.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">list_alt</span>
                  {t('ai_config.found_models_count', { count: discoveredModels.length })}
                </p>
                <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
                  {discoveredModels.map(m => {
                    const isStarred = softModels.includes(m.id);
                    const isPerm = isPermanent(m.id);
                    const isPrimary = effectivePrimaryModel === m.id;
                    const isFallback = fallbackModel === m.id;

                    return (
                      <div 
                        key={m.id}
                        className={`p-3.5 rounded-xl border transition-colors flex items-start gap-3 sm:gap-4 ${
                          isPrimary 
                            ? 'bg-primary/15 border-primary text-slate-100 shadow-sm'
                            : isStarred
                            ? 'bg-background-dark/90 border-amber-500/25 text-slate-200'
                            : 'bg-background-dark/70 border-primary/10 hover:border-primary/25 text-slate-300'
                        }`}
                      >
                        {/* КОЛОНА 1: Звездата */}
                        <div className="pt-0.5 shrink-0 flex items-center justify-center">
                          {isPerm ? (
                            <span 
                              className="text-amber-400 select-none p-1 block" 
                              title={t('ai_config.permanent_tooltip')}
                            >
                              <span className="material-symbols-outlined text-2xl fill-current text-amber-400">star</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleStar(m.id)}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                isStarred 
                                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10' 
                                  : 'text-slate-500 hover:text-amber-400 hover:bg-slate-700/50'
                              }`}
                              title={isStarred ? t('ai_config.star_active_tooltip') : t('ai_config.star_inactive_tooltip')}
                            >
                              <span className={`material-symbols-outlined text-2xl ${isStarred ? 'fill-current text-amber-400' : ''}`}>
                                {isStarred ? 'star' : 'star_border'}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* КОЛОНА 2: Вътрешна структура с 3 реда */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          {/* Ред 1: Името на модела (БЕЗ етикети) */}
                          <div className="text-sm font-extrabold text-slate-100 tracking-wide truncate">
                            {getReadableName(m.id)}
                          </div>

                          {/* Ред 2: Техническото наименование и пояснение */}
                          <div className="text-xs font-mono text-slate-400 select-all truncate">
                            {getTechnicalSubtitle(m.id)}
                          </div>

                          {/* Ред 3: Статуси "Основен" и "Резервен" един до друг (само оцветяване, без избор) */}
                          <div className="flex items-center gap-2 pt-1 select-none">
                            <span
                              className={`px-3 py-1 text-xs rounded-lg border font-bold transition-all ${
                                isPrimary 
                                  ? 'bg-primary text-background-dark border-primary font-black shadow-sm' 
                                  : 'bg-background-dark/40 text-slate-500 border-slate-700/40 opacity-40'
                              }`}
                            >
                              {t('ai_config.badge_primary')}
                            </span>

                            <span
                              className={`px-3 py-1 text-xs rounded-lg border font-bold transition-all ${
                                isFallback 
                                  ? 'bg-amber-400 text-background-dark border-amber-400 font-black shadow-sm' 
                                  : 'bg-background-dark/40 text-slate-500 border-slate-700/40 opacity-40'
                              }`}
                            >
                              {t('ai_config.badge_fallback')}
                            </span>
                          </div>
                        </div>

                        {/* КОЛОНА 3: Бутон за премахване/изтриване (или статус) */}
                        <div className="pt-0.5 shrink-0 flex items-center justify-center">
                          {isPerm ? (
                            <span 
                              className="p-1.5 text-slate-600 cursor-not-allowed select-none" 
                              title={t('ai_config.permanent_tooltip')}
                            >
                              <span className="material-symbols-outlined text-lg">lock</span>
                            </span>
                          ) : isStarred ? (
                            <button
                              type="button"
                              onClick={() => toggleStar(m.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/15 transition-colors cursor-pointer"
                              title={t('ai_config.star_active_tooltip')}
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          ) : (
                            <div className="w-8" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAIConfig;
