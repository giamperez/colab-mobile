export type PetColorwayId = 'shiba' | 'choco' | 'night' | 'snow' | 'ash';

export interface PetColorway {
  id: PetColorwayId;
  name: string;
  main: string;
  secondary: string;
}

export const PET_COLORWAYS: PetColorway[] = [
  { id: 'shiba', name: 'Shiba (Naranja)', main: '#E29455', secondary: '#F7EAD0' },
  { id: 'choco', name: 'Chocolate', main: '#8B5E3C', secondary: '#EFD9B4' },
  { id: 'night', name: 'Medianoche', main: '#33363C', secondary: '#B7BCC4' },
  { id: 'snow', name: 'Nieve', main: '#EDEDE8', secondary: '#FFFFFF' },
  { id: 'ash', name: 'Ceniza', main: '#8B93A0', secondary: '#F1F1EC' },
];

export const getPetColorway = (id: PetColorwayId | string | undefined): PetColorway =>
  PET_COLORWAYS.find((c) => c.id === id) ?? PET_COLORWAYS[0];
