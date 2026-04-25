export const PLATFORM_COLOR_OPTIONS = [
  { value: "white", labelKey: "platform.color.white", className: "bg-white", chartColor: "#ffffff" },
  { value: "black", labelKey: "platform.color.black", className: "bg-black", chartColor: "#020617" },
  { value: "cyan", labelKey: "platform.color.cyan", className: "bg-cyan-400", chartColor: "#22d3ee" },
  { value: "yellow", labelKey: "platform.color.yellow", className: "bg-yellow-400", chartColor: "#facc15" },
  { value: "green", labelKey: "platform.color.green", className: "bg-green-500", chartColor: "#22c55e" },
  { value: "blue", labelKey: "platform.color.blue", className: "bg-blue-500", chartColor: "#3b82f6" },
] as const;

export type PlatformColorToken = (typeof PLATFORM_COLOR_OPTIONS)[number]["value"];

export function getPlatformColorOption(value?: string | null) {
  return (
    PLATFORM_COLOR_OPTIONS.find((option) => option.value === value) ??
    PLATFORM_COLOR_OPTIONS[5]
  );
}
