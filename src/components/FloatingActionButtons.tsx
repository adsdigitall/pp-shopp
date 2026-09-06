import React from 'react';

interface FloatingActionButtonsProps {
  whatsappConnected: boolean;
  onOpenWhatsApp: () => void;
  onOpenNotifications: () => void;
  onToggleTheme: () => void;
  darkMode: boolean;
  onOpenAnalytics: () => void;
}

export const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = () => {
  return null;
};

export default FloatingActionButtons;