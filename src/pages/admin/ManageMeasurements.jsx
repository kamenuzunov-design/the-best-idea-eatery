import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';

const ManageMeasurements = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [nameBg, setNameBg] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [type, setType] = useState('weight');
  const [baseWeight, setBaseWeight] = useState('');
  const [isSystemUnit, setIsSystemUnit] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'measurements'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeasurements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveMeasurement = async (e) => {
    e.preventDefault();
    if (!nameBg || !nameEn) return;

    try {
      const unitData = {
        name_bg: nameBg,
        name_en: nameEn,
        type,
        base_weight_grams: baseWeight ? parseFloat(baseWeight) : null,
        is_system_unit: isSystemUnit
      };

      if (editingId) {
        await updateDoc(doc(db, 'measurements', editingId), unitData);
        await logActivity(user.uid, user.email, 'edit_measurement', `Edited measurement unit: ${nameEn}`);
      } else {
        await addDoc(collection(db, 'measurements'), unitData);
        await logActivity(user.uid, user.email, 'add_measurement', `Added measurement unit: ${nameEn}`);
      }
      
      handleCancelEdit();
    } catch (error) {
      console.error("Error saving measurement:", error);
      alert(isBg ? 'Грешка при запазване.' : 'Error saving.');
    }
  };

  const handleEditClick = (m) => {
    setEditingId(m.id);
    setNameBg(m.name_bg || m.name || '');
    setNameEn(m.name_en || '');
    setType(m.type || 'weight');
    setBaseWeight(m.base_weight_grams || '');
    setIsSystemUnit(m.is_system_unit !== false);
    // scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNameBg('');
    setNameEn('');
    setType('weight');
    setBaseWeight('');
    setIsSystemUnit(true);
  };

  const handleDelete = async (id, mName) => {
    if (!window.confirm(isBg ? 'Сигурни ли сте, че искате да изтриете тази мярка?' : 'Are you sure you want to delete this unit?')) return;
    
    try {
      await deleteDoc(doc(db, 'measurements', id));
      await logActivity(user.uid, user.email, 'delete_measurement', `Deleted measurement unit: ${mName}`);
    } catch (error) {
      console.error("Error deleting measurement:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 h-screen">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Мерни Единици' : 'Measurements'}</h1>
          <p className="text-xs font-medium text-primary/70">{measurements.length} {isBg ? 'въведени' : 'units'}</p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        <form onSubmit={handleSaveMeasurement} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg mb-6 space-y-4 transition-colors ${editingId ? 'bg-[#b8860b]/10 border-[#b8860b]/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest">
              {editingId 
                ? (isBg ? 'Редактиране на мярка' : 'Edit Unit') 
                : (isBg ? 'Нова мерна единица' : 'New Unit')}
            </h3>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold">
                {isBg ? 'Отказ' : 'Cancel'}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Име (BG)' : 'Name (BG)'}</label>
              <input value={nameBg} onChange={(e) => setNameBg(e.target.value)} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="Чаена лъжица" />
            </div>
            
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Име (EN)' : 'Name (EN)'}</label>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="Teaspoon" />
            </div>
            
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Тип' : 'Type'}</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm">
                <option value="weight">{isBg ? 'Тегло (Weight)' : 'Weight'}</option>
                <option value="volume">{isBg ? 'Обем (Volume)' : 'Volume'}</option>
                <option value="count">{isBg ? 'Брой (Count)' : 'Count'}</option>
                <option value="custom">{isBg ? 'Специфично (Custom)' : 'Custom'}</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Грамаж (Base)' : 'Base Grams'}</label>
              <input type="number" step="0.01" value={baseWeight} onChange={(e) => setBaseWeight(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="напр. 5" />
            </div>
            
            <div className="col-span-2 flex items-center gap-2 mt-2">
              <input type="checkbox" id="isSystem" checked={isSystemUnit} onChange={(e) => setIsSystemUnit(e.target.checked)} className="accent-primary" />
              <label htmlFor="isSystem" className="text-sm text-slate-300">
                {isBg ? 'Системна единица (Стандартна)' : 'System Unit (Standard)'}
              </label>
            </div>
          </div>
          
          <button type="submit" className={`w-full font-bold py-2 rounded-lg transition-colors border mt-2 flex justify-center items-center gap-2 ${editingId ? 'bg-[#b8860b]/20 hover:bg-[#b8860b]/30 text-[#b8860b] border-[#b8860b]/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}>
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? (isBg ? 'Запази промените' : 'Save Changes') : (isBg ? 'Добави мярка' : 'Add Unit')}
          </button>
        </form>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-10 text-primary">
              <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
            </div>
          ) : (
            measurements.map(m => (
              <div key={m.id} className="bg-surface-dark/50 border border-primary/10 rounded-xl p-3 flex justify-between items-center group hover:border-primary/30 transition-colors">
                <div>
                  <h4 className="font-bold text-slate-100">{m.name_bg || m.name} <span className="text-slate-500 font-normal text-xs ml-1">/ {m.name_en || 'липсва EN'}</span></h4>
                  <div className="flex gap-2 text-xs text-slate-400 mt-1">
                    <span className="bg-background-dark px-2 rounded border border-primary/10 uppercase">{m.type}</span>
                    {m.base_weight_grams && <span className="text-[#b8860b]">{m.base_weight_grams}g</span>}
                    {m.is_system_unit && <span className="text-emerald-500 material-symbols-outlined text-[14px]" title="System Unit">verified</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditClick(m)} className="p-2 text-slate-400 hover:text-primary transition-colors bg-background-dark/50 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(m.id, m.name_bg || m.name)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors bg-background-dark/50 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageMeasurements;
