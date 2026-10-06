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
  KNOWN_GEMINI_MODELS
} from '../../lib/geminiClient';

const ManageAIConfig = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [currentConfig, setCurrentConfig] = useState(null);

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

  // Load current remote configuration from Firestore on mount
  useEffect(() => {
    const load = async () => {
      setLoadingConfig(true);
      try {
        const config = await getRemoteAIConfig();
        setCurrentConfig(config);
        const pModel = config.primary_model || PRIMARY_GEMINI_MODEL;
        const fModel = config.fallback_model || FALLBACK_GEMINI_MODEL;

        const isKnown = KNOWN_GEMINI_MODELS.some(m => m.id === pModel);
        if (isKnown) {
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!effectivePrimaryModel) {
      alert(t('ai_config.error_no_model'));
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Save local API key if changed
      if (apiKey && apiKey.trim()) {
        setGeminiApiKey(apiKey.trim());
      }

      const updated = await saveRemoteAIConfig({
        primary_model: effectivePrimaryModel,
        fallback_model: fallbackModel,
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
                <p className="text-base font-extrabold text-primary mt-0.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  {currentConfig?.primary_model || PRIMARY_GEMINI_MODEL}
                </p>
              </div>

              <div className="bg-background-dark/70 rounded-xl p-3 border border-primary/10">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('ai_config.active_fallback_label')}</p>
                <p className="text-sm font-bold text-slate-300 mt-0.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-amber-400">shield</span>
                  {currentConfig?.fallback_model || FALLBACK_GEMINI_MODEL}
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
              value={primaryModel}
              onChange={(e) => handleSelectPrimary(e.target.value)}
              className="w-full h-11 bg-background-dark border border-primary/30 rounded-xl px-3.5 text-sm text-slate-100 focus:border-primary focus:outline-none transition-colors"
            >
              {KNOWN_GEMINI_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
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
              onChange={(e) => setFallbackModel(e.target.value)}
              className="w-full h-11 bg-background-dark border border-primary/30 rounded-xl px-3.5 text-sm text-slate-100 focus:border-primary focus:outline-none transition-colors"
            >
              {KNOWN_GEMINI_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
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
              className="h-10 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
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

        {/* Discovery & Inspection Panel */}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {discoveredModels.map(m => {
                    const isSelected = effectivePrimaryModel === m.id;
                    return (
                      <div 
                        key={m.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
                          isSelected 
                            ? 'bg-primary/15 border-primary text-slate-100 shadow-sm'
                            : 'bg-background-dark/80 border-primary/10 hover:border-primary/30 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-extrabold truncate text-primary">{m.id}</span>
                            {isSelected && (
                              <span className="text-[9px] bg-primary text-background-dark px-1.5 py-0.5 rounded font-black uppercase">
                                {t('ai_config.selected_badge')}
                              </span>
                            )}
                          </div>
                          {m.displayName && m.displayName !== m.id && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{m.displayName}</p>
                          )}
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectPrimary(m.id);
                            }}
                            className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold rounded-lg border border-primary/25 cursor-pointer active:scale-95 transition-all"
                          >
                            {isSelected ? t('ai_config.btn_current_active') : t('ai_config.btn_use_as_primary')}
                          </button>
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
