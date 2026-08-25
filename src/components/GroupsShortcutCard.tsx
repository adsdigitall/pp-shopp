import React from 'react';
import { Users, MessageCircle, ArrowRight } from 'lucide-react';

interface GroupsShortcutCardProps {
  onOpenGroups: () => void;
}

export const GroupsShortcutCard: React.FC<GroupsShortcutCardProps> = ({ onOpenGroups }) => {
  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
            Seus grupos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            3 grupos favoritos conectados (WhatsApp & Canais)
          </p>
        </div>
      </div>

      <button
        onClick={onOpenGroups}
        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
      >
        <MessageCircle className="w-4 h-4 fill-white/20" />
        <span>Ver grupos</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
