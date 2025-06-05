import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ModalContextType {
  showModal: (modalId: string, props?: Record<string, any>) => void;
  hideModal: () => void;
  modalId: string | null;
  modalProps: Record<string, any>;
  isModalReady: boolean;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalId, setModalId] = useState<string | null>(null);
  const [modalProps, setModalProps] = useState<Record<string, any>>({});
  const [isModalReady, setIsModalReady] = useState(false);

  const showModal = useCallback((id: string, props = {}) => {
    console.log('🔵 ModalManager: showModal called with', id, props);
    
    // Use requestAnimationFrame to defer modal rendering by one frame
    // This ensures React has finished all pending updates before we show the modal
    requestAnimationFrame(() => {
      console.log('🔵 ModalManager: Setting modal state', id);
      setModalId(id);
      setModalProps(props);
      
      // Add another frame delay to ensure the modal DOM is ready
      requestAnimationFrame(() => {
        setIsModalReady(true);
        console.log('🔵 ModalManager: Modal is ready for interaction', id);
      });
    });
  }, []);

  const hideModal = useCallback(() => {
    console.log('🔵 ModalManager: hideModal called');
    setIsModalReady(false);
    setModalId(null);
    setModalProps({});
  }, []);

  // Reset ready state when modal changes
  useEffect(() => {
    if (!modalId) {
      setIsModalReady(false);
    }
  }, [modalId]);

  const contextValue = {
    showModal,
    hideModal,
    modalId,
    modalProps,
    isModalReady
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return context;
}; 