import { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from '@/hooks/useUserRole';

interface TestRoleContextType {
  testRole: UserRole | null;
  setTestRole: (role: UserRole | null) => void;
  isTestMode: boolean;
}

const TestRoleContext = createContext<TestRoleContextType | undefined>(undefined);

export const TestRoleProvider = ({ children }: { children: ReactNode }) => {
  const [testRole, setTestRole] = useState<UserRole | null>(null);

  return (
    <TestRoleContext.Provider value={{
      testRole,
      setTestRole,
      isTestMode: testRole !== null,
    }}>
      {children}
    </TestRoleContext.Provider>
  );
};

export const useTestRole = () => {
  const context = useContext(TestRoleContext);
  if (context === undefined) {
    throw new Error('useTestRole must be used within a TestRoleProvider');
  }
  return context;
};