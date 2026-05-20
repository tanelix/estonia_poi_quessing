export type Difficulty = 'easy' | 'medium' | 'hard';

export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'city' | 'water' | 'terrain' | 'river';
  difficulty: Difficulty;
  path?: [number, number][]; // For rivers: array of [lat, lng] points
}

export const POIs: POI[] = [
  // Easy
  { id: 'tallinn', name: 'Tallinn', lat: 59.4370, lng: 24.7536, type: 'city', difficulty: 'easy' },
  { id: 'tartu', name: 'Tartu', lat: 58.3780, lng: 26.7290, type: 'city', difficulty: 'easy' },
  { id: 'narva', name: 'Narva', lat: 59.3797, lng: 28.1791, type: 'city', difficulty: 'easy' },
  { id: 'parnu', name: 'Pärnu', lat: 58.3859, lng: 24.4971, type: 'city', difficulty: 'easy' },
  { id: 'peipsi', name: 'Peipsi järv', lat: 58.7075, lng: 27.4206, type: 'water', difficulty: 'easy' },
  { id: 'vortsjarv', name: 'Võrtsjärv', lat: 58.2833, lng: 26.0333, type: 'water', difficulty: 'easy' },

  // Medium
  { id: 'viljandi', name: 'Viljandi', lat: 58.2667, lng: 25.5667, type: 'city', difficulty: 'medium' },
  { id: 'rakvere', name: 'Rakvere', lat: 59.3467, lng: 26.3631, type: 'city', difficulty: 'medium' },
  { id: 'kuressaare', name: 'Kuressaare', lat: 58.2500, lng: 22.5000, type: 'city', difficulty: 'medium' },
  { id: 'haapsalu', name: 'Haapsalu', lat: 58.9431, lng: 23.5414, type: 'city', difficulty: 'medium' },
  { id: 'voru', name: 'Võru', lat: 57.8447, lng: 27.0003, type: 'city', difficulty: 'medium' },
  { 
    id: 'emajogi', name: 'Emajõgi', lat: 58.4000, lng: 26.8500, type: 'river', difficulty: 'medium',
    path: [[58.378, 26.729], [58.40, 26.90], [58.43, 27.24]]
  },
  { 
    id: 'parnu_jogi', name: 'Pärnu jõgi', lat: 58.4500, lng: 24.8000, type: 'river', difficulty: 'medium',
    path: [[58.38, 24.50], [58.50, 24.85], [58.80, 25.43]]
  },
  { 
    id: 'narva_jogi', name: 'Narva jõgi', lat: 59.2500, lng: 28.0500, type: 'river', difficulty: 'medium',
    path: [[59.38, 28.20], [59.18, 27.85], [58.98, 27.73]]
  },
  { id: 'hiiumaa', name: 'Hiiumaa', lat: 58.9000, lng: 22.6500, type: 'terrain', difficulty: 'medium' },

  // Hard
  { id: 'suur_munamagi', name: 'Suur Munamägi', lat: 57.7139, lng: 27.0569, type: 'terrain', difficulty: 'hard' },
  { id: 'soomaa', name: 'Soomaa', lat: 58.4333, lng: 25.0833, type: 'terrain', difficulty: 'hard' },
  { id: 'matsalu', name: 'Matsalu laht', lat: 58.7500, lng: 23.6333, type: 'water', difficulty: 'hard' },
  { id: 'endla', name: 'Endla raba', lat: 58.8500, lng: 26.2000, type: 'terrain', difficulty: 'hard' },
  { 
    id: 'kasari', name: 'Kasari jõgi', lat: 58.7333, lng: 23.9500, type: 'river', difficulty: 'hard',
    path: [[58.73, 23.95], [58.78, 24.10], [58.85, 24.30]]
  },
  { id: 'kardla', name: 'Kärdla', lat: 59.0000, lng: 22.7500, type: 'city', difficulty: 'hard' },
  { id: 'valga', name: 'Valga', lat: 57.7778, lng: 26.0361, type: 'city', difficulty: 'hard' },
  { id: 'polva', name: 'Põlva', lat: 58.0500, lng: 27.0667, type: 'city', difficulty: 'hard' },
  { id: 'tapa', name: 'Tapa', lat: 59.2667, lng: 25.9667, type: 'city', difficulty: 'hard' },
  { id: 'otepaa_korgendik', name: 'Otepää kõrgendik', lat: 58.0500, lng: 26.5000, type: 'terrain', difficulty: 'hard' },
  { id: 'haanja_korgendik', name: 'Haanja kõrgendik', lat: 57.7167, lng: 27.0500, type: 'terrain', difficulty: 'hard' },
  { id: 'pandivere_korgendik', name: 'Pandivere kõrgendik', lat: 59.1333, lng: 26.3333, type: 'terrain', difficulty: 'hard' },
  { id: 'sakala_korgendik', name: 'Sakala kõrgendik', lat: 58.1833, lng: 25.5000, type: 'terrain', difficulty: 'hard' },
  { id: 'rouge_urgorg', name: 'Rõuge ürgorg', lat: 57.7333, lng: 26.9167, type: 'terrain', difficulty: 'hard' },
  { id: 'taevaskoda', name: 'Taevaskoda', lat: 58.1000, lng: 27.0500, type: 'terrain', difficulty: 'hard' }
];

export const TOLERANCES = {
  easy: 150, // km
  medium: 100, // km
  hard: 50 // km
};
