import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PetColorwayId, PET_COLORWAYS } from '../components/petColorways';

export type MascotType = 'dog' | 'cat' | 'ironman';

export interface MascotTypeOption {
  id: MascotType;
  name: string;
  desc: string;
  supportsColorway: boolean;
}

export const MASCOT_TYPES: MascotTypeOption[] = [
  { id: 'dog', name: 'Cobi (Perrito)', desc: 'Un compañero peludo y alegre siempre atento', supportsColorway: true },
  { id: 'cat', name: 'Labi (Gatita)', desc: 'Una felina ágil y astuta con mucho estilo', supportsColorway: true },
  { id: 'ironman', name: 'Iron Man', desc: 'El clásico superhéroe pixel-art de Stark Tech', supportsColorway: false },
];

interface MascotContextType {
  mascotType: MascotType;
  setMascotType: (type: MascotType) => Promise<void>;
  mascotColorway: PetColorwayId;
  setMascotColorway: (colorway: PetColorwayId) => Promise<void>;
}

const MascotContext = createContext<MascotContextType>({
  mascotType: 'dog',
  setMascotType: async () => {},
  mascotColorway: 'shiba',
  setMascotColorway: async () => {},
});

const MASCOT_TYPE_KEY = '@colab_mascot_type';
const MASCOT_COLORWAY_KEY = '@colab_mascot_colorway';

export const MascotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mascotType, setMascotTypeState] = useState<MascotType>('dog');
  const [mascotColorway, setMascotColorwayState] = useState<PetColorwayId>('shiba');

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedType = await AsyncStorage.getItem(MASCOT_TYPE_KEY);
        if (savedType && MASCOT_TYPES.some((m) => m.id === savedType)) {
          setMascotTypeState(savedType as MascotType);
        } else {
          setMascotTypeState('dog');
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
