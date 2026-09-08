"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, sidebar, header, footer, className }: AppLayoutProps) {
  return (
    <div className={cn("flex h-screen w-full overflow-hidden bg-background", className)}>
      {sidebar && (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 shrink-0 border-r border-border bg-sidebar">
          {sidebar}
        </aside>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        {header && (
          <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {header}
          </header>
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="container-main py-6">{children}</div>
        </main>
        {footer && (
          <footer className="shrink-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

export function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("space-y-4", className)}>{children}</section>;
}