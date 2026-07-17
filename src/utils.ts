import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function replaceEnvironmentVariables(text: string, variables: { key: string, value: string, enabled: boolean }[]) {
  let result = text;
  variables.filter(v => v.enabled).forEach(v => {
    const regex = new RegExp(`{{${v.key}}}`, 'g');
    result = result.replace(regex, v.value);
  });
  return result;
}
