import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { wordVolleySchema } from '../../schemas/wordVolleySchema';

interface OutletContextType {
  onError?: (message: string) => void;
}

const WordVolleyConfig = () => {
  const navigate = useNavigate();
  const { onError } = useOutletContext<OutletContextType>();

  return (
    <ConfigurationFramework
      schema={wordVolleySchema}
      onCancel={() => navigate('/')}
    />
  );
};

export default WordVolleyConfig; 