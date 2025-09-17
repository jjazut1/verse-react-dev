import { ConfigSchema } from '../components/common/ConfigurationFramework';
import { serverTimestamp } from 'firebase/firestore';

export const placeValueShowdownSchema: ConfigSchema = {
  gameType: 'place-value-showdown',
  title: 'Place Value Showdown',
  description: 'Create an exciting competitive place value game where students challenge an AI teacher to build the largest or smallest numbers using digit positions!',
  
  sections: [
    {
      title: 'Game Settings',
      description: 'Configure basic game parameters',
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          placeholder: '',
          defaultValue: 'Place Value Showdown'
        },
        {
          name: 'numberOfCards',
          label: 'Number of Digits',
          type: 'select',
          required: true,
          options: [
            { value: 1, label: '1 Digit' },
            { value: 2, label: '2 Digits' },
            { value: 3, label: '3 Digits' },
            { value: 4, label: '4 Digits' },
            { value: 5, label: '5 Digits' },
          ],
          defaultValue: 3,
          helpText: 'How many digits each player gets'
        },
        {
          name: 'objective',
          label: 'Objective',
          type: 'select',
          required: true,
          options: [
            { value: 'largest', label: 'Largest Number' },
            { value: 'smallest', label: 'Smallest Number' },
          ],
          defaultValue: 'largest',
          helpText: 'Goal of the game'
        },
        {
          name: 'winningScore',
          label: 'Winning Score',
          type: 'number',
          required: true,
          min: 1,
          max: 20,
          defaultValue: 5,
          helpText: 'Points needed to win the game (1-20)',
          validation: (value) => {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 20) {
              return 'Winning score must be between 1 and 20';
            }
            return undefined;
          }
        },
        {
          name: 'gameMode',
          label: 'Game Mode',
          type: 'select',
          required: true,
          options: [
            { value: 'student-vs-teacher', label: 'Student vs Teacher' },
            { value: 'practice', label: 'Practice Mode' },
          ],
          defaultValue: 'student-vs-teacher',
          helpText: 'Single player practice or competitive mode'
        }
      ]
    },
    {
      title: 'Decimal Settings',
      description: 'Optional decimal place value settings',
      fields: [
        {
          name: 'includeDecimal',
          label: 'Include Decimal Places',
          type: 'switch',
          defaultValue: false,
          helpText: 'Add decimal places to the number'
        },
        {
          name: 'decimalPlaces',
          label: 'Decimal Places',
          type: 'select',
          options: [
            { value: 1, label: '1 Decimal Place' },
            { value: 2, label: '2 Decimal Places' },
            { value: 3, label: '3 Decimal Places' },
          ],
          defaultValue: 3,
          helpText: 'Number of decimal places to include'
        }
      ]
    },
    {
      title: 'Learning Features',
      description: 'Educational enhancement options',
      fields: [
        {
          name: 'enableHints',
          label: 'Enable Place Value Toggle Buttons',
          type: 'switch',
          defaultValue: true,
          helpText: 'Allow students to toggle visual cues on/off during gameplay'
        }
      ]
    },
    {
      title: 'Sharing',
      description: 'Make your game available to other teachers',
      fields: [
        {
          name: 'share',
          label: 'Share this game publicly',
          type: 'switch',
          defaultValue: false,
          helpText: 'Public games can be used by other teachers as templates'
        }
      ]
    }
  ],
  
  customValidation: (formData) => {
    // Custom validation logic
    if (formData.includeDecimal && !formData.decimalPlaces) {
      return 'Please select number of decimal places when including decimals';
    }
    return undefined;
  },
  
  generateConfig: (formData, currentUser) => {
    // Generate the final configuration object
    const totalDigits = formData.includeDecimal ? formData.numberOfCards + formData.decimalPlaces : formData.numberOfCards;
    
    return {
      title: formData.title,
      type: 'place-value-showdown',
    schemaVersion: 'v1',
      description: `Place value game with ${formData.numberOfCards} digits${formData.includeDecimal ? ` + ${formData.decimalPlaces} decimal places` : ''}, aiming for ${formData.objective} number. First to ${formData.winningScore} points wins!`,
      difficulty: 'medium',
      timeLimit: 300,
      targetScore: formData.winningScore,
      numberOfCards: formData.numberOfCards,
      objective: formData.objective,
      winningScore: formData.winningScore,
      aiDifficulty: 'medium',
      playerName: 'Student',
      teacherName: currentUser?.displayName || 'Teacher',
      enableHints: formData.enableHints,
      gameMode: formData.gameMode,
      includeDecimal: formData.includeDecimal,
      decimalPlaces: formData.decimalPlaces,
      share: formData.share,
      email: currentUser?.email,
      userId: currentUser?.uid,
      createdAt: serverTimestamp(),
    };
  }
}; 