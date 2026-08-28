import React from 'react';
import { ShoppingCart, ClipboardList, MessageCircle, Coins, ChevronRight } from 'lucide-react';

export const HowItWorks: React.FC<{ onStepClick?: (step: number) => void }> = ({ onStepClick }) => {
  const steps = [
    {
      num: 1,
      title: 'Escolha',
      desc: 'Escolha um produto.',
      icon: <ShoppingCart className="w-5 h-5 text-[#EE4D2D]" />,
      bg: 'bg-orange-50',
    },
    {
      num: 2,
      title: 'Revisa',
      desc: 'Revise os detalhes.',
      icon: <ClipboardList className="w-5 h-5 text-[#EE4D2D]" />,
      bg: 'bg-orange-50',
    },
    {
      num: 3,
      title: 'Envia',
      desc: 'Envie para seus grupos.',
      icon: <MessageCircle className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
    },
    {
      num: 4,
      title: 'Ganha',
      desc: 'Ganhe comissão por cada venda.',
      icon: <Coins className="w-5 h-5 text-amber-500" />,
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm shadow-slate-200/50">
      <div className="text-center mb-5">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
          Como funciona
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Passo a passo simples para faturar como afiliado
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative">
        {steps.map((step, idx) => (
          <button type="button" key={step.num} onClick={() => onStepClick?.(step.num)} className="flex flex-col items-center text-center relative group cursor-pointer">
            
            {/* Step Number Badge */}
            <div className="w-5 h-5 rounded-full bg-[#EE4D2D] text-white text-[11px] font-bold flex items-center justify-center mb-2 shadow-xs ring-2 ring-white">
              {step.num}
            </div>

            {/* Step Icon Circle */}
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${step.bg} flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105 duration-200 border border-slate-100 shadow-inner`}>
              {step.icon}
            </div>

            {/* Step Title & Description */}
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              {step.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 max-w-[130px] leading-tight">
              {step.desc}
            </p>

            {/* Connector arrow (only between items on desktop) */}
            {idx < steps.length - 1 && (
              <div className="hidden md:flex absolute top-9 -right-3 text-orange-300 pointer-events-none">
                <ChevronRight className="w-5 h-5" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
