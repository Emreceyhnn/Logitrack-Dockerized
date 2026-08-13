export const driverConsoleKeys = {
  all: ["driverConsole"] as const,
  dashboard: () => [...driverConsoleKeys.all, "dashboard"] as const,
};
