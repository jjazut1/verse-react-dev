import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ConfigurationFramework } from '../../components/common/ConfigurationFramework';
import { placeValueShowdownSchema } from '../../schemas/placeValueShowdownSchema';

interface OutletContextType {
  onError?: (message: string) => void;
}

const PlaceValueShowdownConfig = () => {
  const navigate = useNavigate();
  const { onError } = useOutletContext<OutletContextType>();

  const handleCancel = () => {
    navigate('/teacher');
  };

  return (
    <ConfigurationFramework
      schema={placeValueShowdownSchema}
      onCancel={handleCancel}
    />
  );
};

export default PlaceValueShowdownConfig; 