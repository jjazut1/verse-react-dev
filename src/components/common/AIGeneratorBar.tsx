import React from 'react';
import { HStack, Input, Select, Button } from '@chakra-ui/react';

export interface AIGeneratorBarProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  count: number;
  onCountChange: (v: number) => void;
  replace: boolean;
  onReplaceChange: (v: boolean) => void;
  isLoading?: boolean;
  onGenerate: () => void;
  promptPlaceholder?: string;
  counts?: number[]; // allowed counts
}

const DEFAULT_COUNTS = [10, 15, 20, 25];

export const AIGeneratorBar: React.FC<AIGeneratorBarProps> = ({
  prompt,
  onPromptChange,
  count,
  onCountChange,
  replace,
  onReplaceChange,
  isLoading,
  onGenerate,
  promptPlaceholder,
  counts,
}) => {
  const options = counts && counts.length > 0 ? counts : DEFAULT_COUNTS;
  return (
    <HStack align="stretch" spacing={2}>
      <Input
        placeholder={promptPlaceholder || 'Describe items to generate'}
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
      />
      <Select width="110px" value={count} onChange={(e) => onCountChange(Number(e.target.value))}>
        {options.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </Select>
      <Select width="130px" value={replace ? 'replace' : 'append'} onChange={(e) => onReplaceChange(e.target.value === 'replace')}>
        <option value="append">Append</option>
        <option value="replace">Replace</option>
      </Select>
      <Button colorScheme="purple" isLoading={isLoading} onClick={onGenerate}>Generate</Button>
    </HStack>
  );
};

export default AIGeneratorBar;


