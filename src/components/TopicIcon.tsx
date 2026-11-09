import type { ComponentType } from 'react';
import {
  Braces,
  ChartNoAxesCombined,
  Code2,
  Flag,
  FolderKanban,
  Layers3,
  Network,
  Search,
  Sparkles,
  Terminal,
  Waypoints,
} from 'lucide-react';
const icons: Record<string, ComponentType<{ size?: number }>> = {
  foundations: Terminal,
  loops: Waypoints,
  arrays: Braces,
  complexity: ChartNoAxesCombined,
  search: Search,
  pointers: Code2,
  structures: Layers3,
  recursion: Network,
  greedy: Sparkles,
  graphs: Network,
  dp: FolderKanban,
  advanced: Flag,
};
export default function TopicIcon({ id, size = 22 }: { id: string; size?: number }) {
  const Icon = icons[id] ?? Code2;
  return <Icon size={size} />;
}
