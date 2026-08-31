import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PetColorwayId, PET_COLORWAYS } from '../components/petColorways';

export type MascotType = 'ironman' | 'dog' | 'cat';

export interface MascotTypeOption {
  id: MascotType;
  name: string;
  desc: string;
  supportsColorway: boolean;
}

export const MASCOT_TYPES: MascotTypeOption[] = [
  { id: 'ironman', name: 'Iron Man', desc: 'El clásico guía pixel-art de la app', supportsColorway: false },
  { id: 'dog', name: 'Perro (Shiba)', desc: 'Un compañero peludo siempre atento', supportsColorway: true },
  { id: 'cat', name: 'Gato', desc: 'Un felino ágil con su propio estilo', supportsColorway: true },
];

interface MascotContextType {
  mascotType: MascotType;
  setMascotType: (type: MascotType) => Promise<void>;
  mascotColorway: PetColorwayId;
  setMascotColorway: (colorway: PetColorwayId) => Promise<void>;
}

const MascotContext = createContext<MascotContextType>({
  mascotType: 'ironman',
  setMascotType: async () => {},
  mascotColorway: 'shiba',
  setMascotColorway: async () => {},
});

const MASCOT_TYPE_KEY = '@colab_mascot_type';
const MASCOT_COLORWAY_KEY = '@colab_mascot_colorway';

export const MascotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mascotType, setMascotTypeState] = useState<MascotType>('ironman');
  const [mascotColorway, setMascotColorwayState] = useState<PetColorwayId>('shiba');

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedType = await AsyncStorage.getItem(MASCOT_TYPE_KEY);
        if (savedType && MASCOT_TYPES.some((m) => m.id === savedType)) {
          setMascotTypeState(savedType as MascotType);
        }
        const savedColorway = await AsyncStorage.getItem(MASCOT_COLORWAY_KEY);
        if (savedColorway && PET_COLORWAYS.some((c) => c.id === savedColorway)) {
          setMascotColorwayState(savedColorway as PetColorwayId);
        }
      } catch (err) {
        console.error('Error loading mascot preference', err);
      }
    };
    loadPreferences();
  }, []);

  const setMascotType = async (type: MascotType) => {
    setMascotTypeState(type);
    try {
      await AsyncStorage.setItem(MASCOT_TYPE_KEY, type);
    } catch (err) {
      console.error('Error saving mascot type', err);
    }
  };

  const setMascotColorway = async (colorway: PetColorwayId) => {
    setMascotColorwayState(colorway);
    try {
      await AsyncStorage.setItem(MASCOT_COLORWAY_KEY, colorway);
    } catch (err) {
      console.error('Error saving mascot colorway', err);
    }
  };

  return (
    <MascotContext.Provider value={{ mascotType, setMascotType, mascotColorway, setMascotColorway }}>
      {children}
    </MascotContext.Provider>
  );
};

export const useMascot = () => useContext(MascotContext);
