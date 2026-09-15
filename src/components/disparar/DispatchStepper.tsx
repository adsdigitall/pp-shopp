import { Check } from 'lucide-react';

export const DISPATCH_STEPS = ['Ofertas', 'Mensagem', 'Destinos', 'Intervalo', 'Revisão'] as const;

export function DispatchStepper({ step, onGoTo }: { step: number; onGoTo: (step: number) => void }) {
  return (
    <ol className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
      {DISPATCH_STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < step;
        const current = number === step;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => done && onGoTo(number)}
              disabled={!done}
              aria-current={current ? 'step' : undefined}
              className="flex items-center gap-2.5 disabled:cursor-default"
            >
              <span className={`grid h-8 w-8 place-items-center rounded-full border text-sm font-bold transition-colors ${current || done ? 'border-[var(--brand-500)] bg-[var(--brand-500)] text-white' : 'border-[var(--border-strong)] text-[var(--text-secondary)]'}`}>
                {done ? <Check className="h-4 w-4" /> : number}
              </span>
              <span className={`text-[15px] ${current ? 'font-semibold text-[var(--text-title)]' : done ? 'text-[var(--text-body)]' : 'text-[var(--text-secondary)]'}`}>{label}</span>
            </button>
            {number < DISPATCH_STEPS.length && <span className={`mx-2 h-px w-8 sm:w-12 ${done ? 'bg-[var(--brand-500)]' : 'bg-[var(--border-default)]'}`} />}
          </li>
        );
      })}
    </ol>
  );
}
