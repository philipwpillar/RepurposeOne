"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme, type Theme } from "@/components/theme/theme-provider";

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section id="appearance" className="space-y-4 scroll-mt-20">
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Choose Light, Dark, or match your system setting.
        </p>
      </div>

      <Tabs
        value={theme}
        onValueChange={(value) => setTheme(value as Theme)}
        className="w-full max-w-md"
      >
        <TabsList aria-label="Theme">
          <TabsTrigger value="light">Light</TabsTrigger>
          <TabsTrigger value="dark">Dark</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
      </Tabs>
    </section>
  );
}
