import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { anagramSchema } from '../../schemas/anagramSchema';

interface OutletContextType {
  onError?: (message: string) => void;
}

const AnagramConfig = () => {
  const navigate = useNavigate();
  const { onError } = useOutletContext<OutletContextType>();

  return (
    <ConfigurationFramework
      schema={anagramSchema}
      onCancel={() => navigate('/')}
    />
  );
};

export default AnagramConfig; 