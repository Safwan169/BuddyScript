import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';

export default function useUserAuth() {
  return useSelector((state: RootState) => state.user);
}
