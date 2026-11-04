import {
  Rocket,
  Layers,
  Sparkles,
  Code2,
  BookOpen,
  CreditCard,
  HelpCircle,
  GraduationCap,
} from "@/components/icons";

const MAP = { Rocket, Layers, Sparkles, Code2, BookOpen, CreditCard, HelpCircle, GraduationCap };

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name as keyof typeof MAP] ?? Layers;
  return <Icon className={className} />;
}
