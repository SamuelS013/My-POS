import { useContext } from 'react';
import { AppContext } from './AppContext.js';

export function useApp() {
  return useContext(AppContext);
}