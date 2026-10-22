import React from 'react';

interface AppShellProps {
  header: React.ReactNode;
  bottomNav: React.ReactNode;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ header, bottomNav, children }) => {
  return (
    <div className="min-h-[100dvh] w-full bg-[var(--inal-outer-bg)] flex justify-center overflow-x-hidden">
      <div className="relative flex min-h-[100dvh] w-full min-w-[320px] max-w-[430px] flex-col bg-inal-bg shadow-xl">
        {header}
        <main
          className="flex-1 w-full px-3.5 pt-3 overflow-x-hidden"
          style={{ paddingBottom: 'calc(5.25rem + var(--safe-bottom))' }}
        >
          {children}
        </main>
        {bottomNav}
      </div>
    </div>
  );
};
