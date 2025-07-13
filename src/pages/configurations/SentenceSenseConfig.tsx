import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { sentenceSenseSchema } from '../../schemas/sentenceSenseSchema';

interface OutletContextType {
  onError?: (message: string) => void;
}

const SentenceSenseConfig = () => {
  const navigate = useNavigate();
  const { onError } = useOutletContext<OutletContextType>();

  return (
    <ConfigurationFramework
      schema={sentenceSenseSchema}
      onCancel={() => navigate('/')}
    />
  );
};

export default SentenceSenseConfig; 