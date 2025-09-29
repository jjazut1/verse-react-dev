# Container Sound Files

This directory contains sound files for the Sort Categories game containers.

## Required Files:

1. **crack.mp3** - Sound for eggs cracking
2. **unwrap.mp3** - Sound for unwrapping presents 
3. **pop.mp3** - Sound for popping balloons
4. **cardboard.mp3** - Sound for opening cardboard boxes

## Where to Get Sound Files:

### Free Sound Resources:
- **Freesound.org** - Large collection of free sound effects
- **Zapsplat.com** - Free with registration
- **BBC Sound Effects** - Free sound library

### Recommended Search Terms:
- **crack.mp3**: "egg crack", "shell crack", "breaking"
- **unwrap.mp3**: "unwrap", "paper rustle", "gift unwrap"
- **pop.mp3**: "balloon pop", "bubble pop", "cork pop"
- **cardboard.mp3**: "cardboard box", "box open", "package open"

### File Requirements:
- Format: MP3
- Duration: 1-3 seconds
- Volume: Moderate (code sets volume to 50%)
- Size: Keep under 100KB for fast loading

## Installation:
1. Download the sound files
2. Rename them to match the required filenames above
3. Place them in the `public/sounds/` directory
4. The game will automatically play the appropriate sound for each container type

## Notes:
- If sound files are missing, the game will still work but won't play container sounds
- Check browser console for "Sound file not found" warnings
- Sounds play at 50% volume to not interfere with text-to-speech 