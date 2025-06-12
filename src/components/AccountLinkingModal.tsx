import React, { useState } from 'react';
import { AccountLinkingService } from '../services/accountLinking';

interface AccountLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  googleCredential: any;
  onLinkingComplete: (result: any) => void;
}

export const AccountLinkingModal: React.FC<AccountLinkingModalProps> = ({
  isOpen,
  onClose,
  email,
  googleCredential,
  onLinkingComplete
}) => {
  const [password, setPassword] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordLinking = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLinking(true);
    setError('');

    try {
      const result = await AccountLinkingService.linkAccountWithPassword(
        email,
        password,
        googleCredential
      );

      if (result.success) {
        onLinkingComplete(result);
        onClose();
      } else {
        setError(result.error || 'Failed to link accounts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLinking(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Link Your Accounts</h2>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            You already have an account with the email <strong>{email}</strong>.
          </p>
          <p className="text-gray-600 mb-4">
            To link your Google account, please enter your current password:
          </p>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your current password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLinking}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handlePasswordLinking}
            disabled={isLinking}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLinking ? 'Linking...' : 'Link Accounts'}
          </button>
          
          <button
            onClick={handleCancel}
            disabled={isLinking}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>
            By linking your accounts, you'll be able to sign in with either your password or Google.
          </p>
        </div>
      </div>
    </div>
  );
}; 