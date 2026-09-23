import React from 'react';
import { DeveloperDocsPage } from './DeveloperDocsPage';

interface DeveloperDocsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  language?: 'id' | 'en';
}

/**
 * Backward compatibility wrapper.
 * User requested Developer Docs to be a full dedicated page instead of a modal dialog.
 */
export const DeveloperDocsModal: React.FC<DeveloperDocsModalProps> = ({
  isOpen = true,
  onClose = () => {},
  language = 'id'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--bg-base)]">
      <DeveloperDocsPage onBack={onClose} language={language} />
    </div>
  );
};
