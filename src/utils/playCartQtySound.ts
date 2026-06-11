import SoundPlayer from 'react-native-sound-player';

const ITEM_ADD_SOUND = require('../assets/sounds/item-add.wav');
const ITEM_REMOVE_SOUND = require('../assets/sounds/item-remove.wav');

function playAsset(asset: number): void {
  try {
    SoundPlayer.playAsset(asset);
  } catch {
    // Optional feedback; ignore playback errors.
  }
}

export function playCartAddSound(): void {
  playAsset(ITEM_ADD_SOUND);
}

export function playCartRemoveSound(): void {
  playAsset(ITEM_REMOVE_SOUND);
}
