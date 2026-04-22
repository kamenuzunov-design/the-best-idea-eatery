import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-dark/95 backdrop-blur-md border-b border-primary/20 shadow-sm">
        <div className="flex items-center p-4 justify-between">
          <button onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-slate-100 text-lg font-extrabold leading-tight tracking-tight">
              {isBg ? 'История на поръчките' : 'Order History'}
            </h1>
            <p className="text-primary text-[10px] font-bold uppercase tracking-widest mt-0.5">The Best Idea Eatery</p>
          </div>
          <button className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-xl">search</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 py-6">
          <h2 className="text-slate-100 text-2xl font-extrabold mb-1 tracking-tight">{isBg ? 'Скорошни поръчки' : 'Recent Orders'}</h2>
          
          <div className="space-y-4 mt-6">
            {/* Order Item 1 */}
            <div className="flex gap-4 bg-surface-dark p-4 rounded-2xl border border-primary/20 shadow-lg hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="bg-center bg-no-repeat bg-cover rounded-xl size-20 shrink-0 border border-primary/30 shadow-md group-hover:scale-105 transition-transform" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBqJkHW125CNMThhTsGcF_FtY625yAwFKaTbe0h_8ouGnbnyAQD0Vntz5fys2QPiy1N553BxaWEpYKyXLAihu_X1faTe0VUIJv2yTtd3-87oH_5ZNJwke45yeeK92Ns94Cb9zI-5QEP0p--s3Upc_O9Z_gSfaXQDY13aiuWrTY5UzO7M_rYheHDKwm4sUxwESjNxQ2EMMf2FQXi0Sv1qxc0e7gsAgsW0Z7Xdke6Oeu4adJTXHb2Fu7ZortRTNGgRaiJap77Mhoqk1E")'}}></div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-100 text-base font-extrabold leading-tight">Gourmet Meal Kit</h3>
                    <span className="text-primary text-sm font-extrabold">145.00 {isBg ? 'лв.' : 'BGN'}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1 font-medium">12.10.2025 • #83921</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {isBg ? 'Доставено' : 'Delivered'}
                  </span>
                  <span className="material-symbols-outlined text-primary text-xl group-hover:translate-x-1 transition-transform">chevron_right</span>
                </div>
              </div>
            </div>

            {/* Order Item 2 */}
            <div className="flex gap-4 bg-surface-dark p-4 rounded-2xl border border-primary/20 shadow-lg hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="bg-center bg-no-repeat bg-cover rounded-xl size-20 shrink-0 border border-primary/30 shadow-md group-hover:scale-105 transition-transform" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCDvzxqIkji7qo_XYbNtH08QVHwJV4_KhaztOppZNgisTljeZfMiMuvGPsJvFfHwJnYFQvudGqWRi0wd8g6-0dUAevD8mWZrwu6-HZ1YeNksH-4WNPDPHtVIsBy_Bws7UjH5QBrd8Bd-QkAVU8qZhTBTax8Z8wc8aWB3I4CFfLb5xw3P-L0A7-ducobUAE-9PZvszN9ufWjIlYkUfowhgV7fmSjw-nqUhz3Ja_nPgvSq-7V0j3Wp5cjEXMNCz_tB1MstTshuqkEnYE")'}}></div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-100 text-base font-extrabold leading-tight">Chef's Table Booking</h3>
                    <span className="text-primary text-sm font-extrabold">320.00 {isBg ? 'лв.' : 'BGN'}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1 font-medium">05.10.2025 • #83754</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {isBg ? 'Завършено' : 'Completed'}
                  </span>
                  <span className="material-symbols-outlined text-primary text-xl group-hover:translate-x-1 transition-transform">chevron_right</span>
                </div>
              </div>
            </div>

            {/* Order Item 3 */}
            <div className="flex gap-4 bg-surface-dark p-4 rounded-2xl border border-primary/20 shadow-lg hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="bg-center bg-no-repeat bg-cover rounded-xl size-20 shrink-0 border border-primary/30 shadow-md group-hover:scale-105 transition-transform" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDyqQGEu8tH8XL3SN5aMDWNF_NJazCbdSZzzJPgU3DyEZ52qti6F7v5jAWpOwFdG0bHE1okmoRMevqllR-5eEeXI6k2NLMjunemOgmD6be_swIfwHA5Yio6DUb9_eGpPHiPoyTTsAyo4RJhZJNo2tLump9vruA6zEZZvD1iqVPk52VSCczY_Vo_mGrJWJlzBux46kszlMfVjcwaXX4ilgOWFcLLscD8ETYgWs6iA64qWMDMkLMh7xYG6s57vEWl00qCdPRxF98Zl34")'}}></div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-100 text-base font-extrabold leading-tight">Premium Ingredients</h3>
                    <span className="text-primary text-sm font-extrabold">89.50 {isBg ? 'лв.' : 'BGN'}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1 font-medium">28.09.2025 • #83612</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {isBg ? 'Доставено' : 'Delivered'}
                  </span>
                  <span className="material-symbols-outlined text-primary text-xl group-hover:translate-x-1 transition-transform">chevron_right</span>
                </div>
              </div>
            </div>

            {/* Featured Promotion Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#b8860b] mt-8 p-8 shadow-[0_15px_40px_rgba(212,175,53,0.3)] cursor-pointer group hover:scale-[1.02] transition-transform">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/30 transition-colors"></div>
              <div className="relative z-10 flex flex-col items-start">
                <span className="material-symbols-outlined text-background-dark/20 text-8xl absolute -right-4 -bottom-4 rotate-12">card_giftcard</span>
                <h4 className="text-background-dark text-2xl font-extrabold mb-2 tracking-tight">{isBg ? 'Подарете преживяване' : 'Gift an Experience'}</h4>
                <p className="text-background-dark/80 text-sm mb-6 font-bold max-w-[80%] leading-relaxed">
                  {isBg ? 'Подарете изключително кулинарно изживяване. Купете ваучер днес.' : 'Give the gift of an extraordinary meal. Purchase a voucher today.'}
                </p>
                <button className="bg-background-dark text-primary px-6 py-3 rounded-xl text-sm font-extrabold uppercase tracking-widest shadow-lg hover:shadow-xl transition-all">
                  {isBg ? 'Вижте ваучерите' : 'View Vouchers'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderHistory;
