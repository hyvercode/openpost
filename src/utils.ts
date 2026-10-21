import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function replaceEnvironmentVariables(text: string, variables: { key: string, value: string, enabled: boolean }[]) {
  if (!text || !Array.isArray(variables)) return text;
  let result = text;
  variables.filter(v => v && v.enabled !== false && v.key).forEach(v => {
    const key = String(v.key).trim();
    if (!key) return;
    if (v.value === undefined || v.value === null) return;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g');
    result = result.replace(regex, String(v.value));
  });
  return result;
}
