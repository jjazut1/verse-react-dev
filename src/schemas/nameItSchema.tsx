import { ConfigSchema } from '../components/common/ConfigurationFramework';
import { serverTimestamp } from 'firebase/firestore';

export const nameItSchema: ConfigSchema = {
  gameType: 'name-it',
  title: 'Name It Game Configuration',
  description: 'Configure your Name It pattern recognition game',
  sections: [
    {
      title: 'Basic Settings',
      fields: [
        {
          name: 'title',
          label: 'Game Title',
          type: 'text',
          defaultValue: 'Name It Game',
          required: true
        }
      ]
    },
    {
      title: 'Game Settings',
      fields: [
        {
          name: 'gameTime',
          label: 'Game Duration (seconds)',
          type: 'slider',
          defaultValue: 300,
          min: 60,
          max: 900
        },
        {
          name: 'difficulty',
          label: 'Difficulty Level',
          type: 'select',
          defaultValue: 'medium',
          options: [
            { value: 'debug', label: 'Debug (20 seconds, testing)' },
            { value: 'easy', label: 'Easy (7 minutes, more forgiving)' },
            { value: 'medium', label: 'Medium (5 minutes, balanced)' },
            { value: 'hard', label: 'Hard (3 minutes, challenging)' }
          ]
        }
      ]
    },
    {
      title: 'Multiplayer Settings',
      fields: [
        {
          name: 'enableWebRTC',
          label: 'Enable Multiplayer',
          type: 'switch',
          defaultValue: false
        }
      ]
    },
    {
      title: 'Audio & Visual',
      fields: [
        {
          name: 'enableSound',
          label: 'Enable Sound Effects',
          type: 'switch',
          defaultValue: true
        }
      ]
    },
    {
      title: 'Sharing',
      fields: [
        {
          name: 'share',
          label: 'Share this game publicly',
          type: 'switch',
          defaultValue: false
        }
      ]
    }
  ],
  generateConfig: (formData: any, currentUser: any) => {
    return {
      title: formData.title || 'Name It Game',
      description: `Name It pattern recognition game - ${formData.difficulty || 'medium'} difficulty`,
      type: 'name-it' as const,
      schemaVersion: 'v1',
      gameTime: formData.gameTime || 300,
      difficulty: formData.difficulty || 'medium',
      enableWebRTC: Boolean(formData.enableWebRTC),
      enableSound: Boolean(formData.enableSound),
      maxPlayers: 2,
      iconSet: [], // Will be populated with default icons
      share: Boolean(formData.share) || false,
      email: currentUser?.email || '',
      userId: currentUser?.uid || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  }
}; 