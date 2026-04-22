import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GourmetCommunity = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32 overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-surface-dark/95 backdrop-blur-md border-b border-primary/20 shadow-sm">
        <div className="flex items-center p-4 justify-between">
          <button onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-primary text-lg font-extrabold leading-tight tracking-wider uppercase">The Best Idea Eatery</h1>
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{isBg ? 'Гурме общество' : 'Gourmet Society'}</span>
          </div>
          <div className="flex w-10 items-center justify-end">
            <button className="relative flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors p-2 text-slate-100">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-1 right-1 size-2 bg-rose-500 rounded-full shadow-[0_0_5px_rgba(244,63,94,0.8)]"></span>
            </button>
          </div>
        </div>
        <div className="px-4 pb-4">
          <label className="flex flex-col w-full group">
            <div className="flex w-full items-stretch rounded-2xl h-12 bg-background-dark border border-primary/20 group focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(212,175,53,0.2)] transition-all shadow-inner">
              <div className="text-primary/60 flex items-center justify-center pl-4 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined text-xl">search</span>
              </div>
              <input 
                className="form-input flex w-full min-w-0 flex-1 border-none bg-transparent focus:outline-0 focus:ring-0 text-slate-100 placeholder:text-slate-500 px-3 text-sm font-medium" 
                placeholder={isBg ? 'Търсене на готвачи или ястия...' : 'Search chefs or dishes...'} 
              />
            </div>
          </label>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-6 border-b border-primary/10">
          <div className="px-4 mb-4 flex justify-between items-end">
            <h2 className="text-slate-100 text-sm font-extrabold uppercase tracking-widest">{isBg ? 'Топ Готвачи' : 'Top Chefs'}</h2>
            <span className="text-primary text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:underline">{isBg ? 'Виж Всички' : 'View All'}</span>
          </div>
          <div className="flex overflow-x-auto px-4 gap-5 no-scrollbar snap-x pb-2">
            {[
              { name: 'Chef Julian', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0-SQd8sNhcIgVgA5Ht1qSirSlhcxcazdE3k-p5QRy5xhfIeaNH7U3Y62YI_f2kzhbLSx3ZwKKrU3CsuHkfTJOHpAv3r5VY12bGJ3c7ZupQjM9l11cwx-cr1zj0SxtdWHh019TdNdDFVopHY0bJNXxeU6DFfeP0GxrPffg3cfBf7NkOacdwCEu1PKB8KqdC1hKRvfqHCzWsKODGzxLQMmQ45KbRar6OyNglYVmYkJLXRlR3y04l-DEbxMxm16koc28ILP4ghuB1J4', active: true },
              { name: 'Chef Maria', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDylzKza1Wf6viwffVG4T2WCPsQIuHSJ8iGpCkSRDLwZGHQ2jH731pZOt9495NbMo8VAXGbx1xXdSxuPT43cpbJMs_fDRAs5EYL_9h0UsZVN5abv9BYTs9dZS0FMvxbkmy8-yBcOQWNYEFKFHeTThFz7IWZ7_7OPwWsiGNjblt2MT7Pwp_kMo4aGbGdDgnuyDq_oPcRGLqRb8TwJpmU4KffNOuQi1Y-7hcaqTw2DiP4ZQpSkEGtfU_2ZrCmz96cTGX8VYYWELmb9A4' },
              { name: 'Chef Ivan', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6ysymp4kia4hFdWtWOD0y2mheEoMlNwJY32an6FLReMo6jnpeyTynmBsBqoKV0ddW2HNA5Xg-F98rdHCV7KX_fob9o8EJb2m8pHgARgpva1Q-4VWsvmGBDTU2I1TyTqcEDOIrgrtz5Uk7EuUwlnmczsXxB8x4oTOVJ2mxhNJceo9ojZw1HUqUAgUm_5-QjwPt3SB82MdvpFlYskl8RvN6wZ-xPdzjY2opcHU-qWI7VDRvfJW9awdtOtPmcdA5Wxd_QCCVQdanAOE' },
              { name: 'Chef Elena', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSas330jbNG7qsnYXMz5S6b7iUjedIZDBpIwh59Rmpbadhjr0VxbgbmIS2hr2-sJsg73fEyL2GS5qfOkmmG2phSjOvgZsj4inrcXANEep6fNdQZbsTtliM0AvzCtF0J5zAlmdTKiLKULZonqQNavDydREClHm3TQgXWVQJgraa5_3XdfOFRAggvNdUc1S3xcn7sGCHEeELv3b35_WIyypcwXjNaTy4-yRd9FeQhMvEdjJEdIcdr0zHCYLH1I4dnNipSFY7on--yYI' },
              { name: 'Chef Stefan', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0TlteSAB5NucApKt7XW7x0EBV1KfufCDlublTmZxPtR99TY8GdpckI7BN58Fq0pp4uqLwTcGn3Zd5HWDVhJqv85o_S9yV_aOSCxZEKnMrlKaE3iWPlB0do1RV8_e0-yOVcg1LpIRjQJL9p-Zn9yPArDTD9cmsVcsmqg2_aDGm3Jv2IGpLamNzqUeXQOrLlARyCPBQe7NRMepP_wkoeB5ftKGywW-DEnSeGL-S2hvSweZME6rR7Zg18P0vZLwYFVqVBrPwoSZl8es' }
            ].map((chef, i) => (
              <div key={i} className={`flex flex-col items-center gap-2 shrink-0 snap-center cursor-pointer transition-transform hover:scale-105 ${chef.active ? '' : 'opacity-80 hover:opacity-100'}`}>
                <div className={`size-16 p-0.5 rounded-full ${chef.active ? 'bg-gradient-to-tr from-primary to-[#b8860b] shadow-[0_0_15px_rgba(212,175,53,0.4)]' : 'border border-primary/30'}`}>
                  <div className="size-full bg-center bg-no-repeat bg-cover rounded-full border-2 border-background-dark" style={{backgroundImage: `url('${chef.img}')`}}></div>
                </div>
                <p className={`text-[11px] font-bold ${chef.active ? 'text-primary' : 'text-slate-400'}`}>{chef.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-10 py-8">
          {/* Post 1 */}
          <article className="flex flex-col gap-3">
            <div className="px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-center bg-no-repeat bg-cover rounded-full border border-primary/50 shadow-sm" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCDYjzeAX0Bo7ctxjXLSwURH_kXgfmOM1YOtIVhPBHfMYAx_EiIK3pgwTTEHMUtYwQSeyWHXPbgN5lqaJ_79NWabwt0wxFvrKQi2_ualAyVeO7R2WkDscT7DcEembocFLkyPJ4j6IUlCWrfvDhfrJO07GwhAqdJHa9EOHAAKtK1bmWqkgjI_zXLElHZehxmL-HdriakRIt7nPZ7eW-Awsd0YXe3kSxReZGMBwYmtXkR5KjqvZ7abjxj8BElpxWjqnLdi99Y-W_6YZ4")'}}></div>
                <div>
                  <h3 className="text-slate-100 text-sm font-extrabold leading-none mb-1">Sophia Rossi</h3>
                  <p className="text-primary/70 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Флоренция, Италия' : 'Florence, Italy'}</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">more_horiz</span></button>
            </div>
            
            <div className="relative w-full aspect-[4/5] bg-surface-dark overflow-hidden border-y border-primary/10 shadow-lg">
              <div className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-700 hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBiqXyHH5Qf0VwdQW0RVFXQYqu5irEyDyPEC9_c23_5qVHlY-kJo7FHrBmwGHpCXPyKx4SibtDaW2C4kw6FzmK8i4Q3lP-LLkw6DkpzEDy3tIlCTRO3cw6PlWR6eyCuBgQfEnhscbxWgD5FzIrzSk4jEHAgbIPtvKhIucOl-un6IxDuPTFMEABKRxDx537aCpiwk4K1Npf6wKpTU9bQb0vsKvSLPpHScAfp5-EbvpJ9LIUGFCOt-NMnkY7uJ9s8gOdtC7dA3FeW2TM")'}}></div>
              <div className="absolute bottom-4 left-4">
                <span className="bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                  {isBg ? 'Шедьовър' : 'Masterpiece'}
                </span>
              </div>
            </div>
            
            <div className="px-4 flex items-center justify-between mt-1">
              <div className="flex items-center gap-6">
                <button className="flex items-center gap-1.5 text-rose-500 hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span>
                  <span className="text-xs font-bold">1.2k</span>
                </button>
                <button className="flex items-center gap-1.5 text-slate-300 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">chat_bubble</span>
                  <span className="text-xs font-bold">48</span>
                </button>
                <button className="flex items-center gap-1.5 text-slate-300 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>
              <button className="text-primary hover:scale-110 transition-transform">
                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>bookmark</span>
              </button>
            </div>
            
            <div className="px-4">
              <h4 className="text-slate-100 text-base font-extrabold mb-1 tracking-tight">{isBg ? 'Ръчно кълцан тартар от Уагю с трюфел' : 'Hand-Cut Wagyu Tartare with Truffle'}</h4>
              <p className="text-slate-400 text-sm italic font-medium leading-relaxed line-clamp-2">The richness of the marbled beef paired perfectly with the earthy notes of fresh black truffle. A culinary dream come true...</p>
            </div>
          </article>

          {/* Post 2 */}
          <article className="flex flex-col gap-3">
            <div className="px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-center bg-no-repeat bg-cover rounded-full border border-primary/50 shadow-sm" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCmOnCVw9srSaMNb8Mrb4NWEXSQnmsQbsIDNUt2MiTyNUpuB3e-aRJV-UBUup-hB1p-GRxgD-UHZJFxqxoOz6bZMgnKLg5PbPH27DdOU8wBM3y-b0aUi6BSJKSLWl3ao9cPpt4z3YcNrz2u4wvR9e4NHK9vIfS4UUQgbRmWE6zFWXD04sFQIhwTzt1IU-RhDUT9s0IRZTT4tMwM1G05dkj3T-uoHA0ur3Wl6IpjbhadDNvZl8TcP9qdLTZN8pgx5sA5GeAwFOdeQXM")'}}></div>
                <div>
                  <h3 className="text-slate-100 text-sm font-extrabold leading-none mb-1">Dimitar Petrov</h3>
                  <p className="text-primary/70 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'София, България' : 'Sofia, Bulgaria'}</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">more_horiz</span></button>
            </div>
            
            <div className="relative w-full aspect-[4/5] bg-surface-dark overflow-hidden border-y border-primary/10 shadow-lg">
              <div className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-700 hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDSBQJRlGfofazCfa5pIQ-3xAnIHg0_1vn4SWrNBho3l8ZI8V03HGiJzRba9erVkIe63MEyh6fUr3AnZ-2M5zS2f8CHo1VGAXI76oefRGHTCjv8o8YVgFbxwBQXa28q_ysT6XRFh_vhYf5vCoR0Ctqcp5OiffqGiI2iegiOD4-oOixOOkvpPvxq_1u5kpSDlmpI_bgXLhPVIxJV7JDudTz6Cewj9ZZRtCqouYhHNYg61IGa9D2yLMv9EAHWX38gddimwByB9KeYpDo")'}}></div>
            </div>
            
            <div className="px-4 flex items-center justify-between mt-1">
              <div className="flex items-center gap-6">
                <button className="flex items-center gap-1.5 text-slate-300 hover:text-rose-500 hover:scale-110 transition-all">
                  <span className="material-symbols-outlined">favorite</span>
                  <span className="text-xs font-bold">856</span>
                </button>
                <button className="flex items-center gap-1.5 text-slate-300 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">chat_bubble</span>
                  <span className="text-xs font-bold">12</span>
                </button>
                <button className="flex items-center gap-1.5 text-slate-300 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>
              <button className="text-slate-300 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">bookmark</span>
              </button>
            </div>
            
            <div className="px-4">
              <h4 className="text-slate-100 text-base font-extrabold mb-1 tracking-tight">{isBg ? 'Модерна деконструкция на Шопска салата' : 'Modern Shopska Salad Deconstruction'}</h4>
            </div>
          </article>
        </section>
      </main>

      <button className="fixed bottom-6 right-6 size-14 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark rounded-full shadow-[0_5px_20px_rgba(212,175,53,0.5)] flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group z-[60]">
        <span className="material-symbols-outlined text-3xl font-extrabold group-hover:rotate-90 transition-transform">add</span>
      </button>
    </div>
  );
};

export default GourmetCommunity;
