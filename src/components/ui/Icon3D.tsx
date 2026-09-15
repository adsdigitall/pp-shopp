import type { CSSProperties, ElementType } from 'react';
import { cn } from '@/lib/utils';

export type Icon3DTone = 'orange' | 'dark' | 'muted' | 'red';

interface Icon3DProps {
  icon: ElementType;
  /** Lado do bloco em px. */
  size?: number;
  tone?: Icon3DTone;
  /** Bolinha laranja no canto (destaque). */
  dot?: boolean;
  /** Sobe um pouco quando o pai com `group` recebe hover. */
  lift?: boolean;
  className?: string;
}

/** Ícone com volume no estilo do logo. Estilos em `.icon-3d` (src/index.css). */
export function Icon3D({ icon: Icon, size = 44, tone = 'orange', dot, lift, className }: Icon3DProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('icon-3d', className)}
      data-tone={tone}
      data-dot={dot ? '' : undefined}
      data-lift={lift ? '' : undefined}
      data-small={size <= 32 ? '' : undefined}
      style={{ '--icon3d-size': `${size}px` } as CSSProperties}
    >
      <Icon strokeWidth={2.6} />
    </span>
  );
}
