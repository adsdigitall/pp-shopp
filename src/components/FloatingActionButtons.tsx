import React, { useState } from 'react';
import { Menu, Zap, Sun, Moon, Bell, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface FloatingActionButtonsProps {
  whatsappConnected: boolean;
  onOpenWhatsApp: () => void;
  onOpenNotifications: () => void;
  onToggleTheme: () => void;
  darkMode: boolean;
  onOpenAnalytics: () => void;
}

export const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
  whatsappConnected,
  onOpenWhatsApp,
  onOpenNotifications,
  onToggleTheme,
  darkMode,
  onOpenAnalytics,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {expanded && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2">
          <Button variant="outline" size="icon" className="bg-[var(--surface)] border border-[var(--border)]" onClick={onOpenWhatsApp}>
            <Zap className="w-4 h-4" style={{ color: whatsappConnected ? 'var(--success)' : 'var(--error)' }} />
          </Button>
          <Button variant="outline" size="icon" className="bg-[var(--surface)] border border-[var(--border)]" onClick={onOpenNotifications}>
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="bg-[var(--surface)] border border-[var(--border)]" onClick={onOpenAnalytics}>
            <Activity className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="bg-[var(--surface)] border border-[var(--border)]" onClick={onToggleTheme}>
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      )}
      <Button
        variant="default"
        className={cn(
          'rounded-full shadow-lg bg-[var(--primary)] text-white h-12 w-12',
          expanded && 'rotate-45'
        )}
        onClick={() => setExpanded(!expanded)}
        size="default"
      >
        <Menu className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default FloatingActionButtons;
