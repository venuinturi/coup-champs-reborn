import { Users, Clock, Wifi } from "lucide-react";

export const GameStats = () => {
  const stats = [
    { icon: Users, label: "2-6 Players" },
    { icon: Clock, label: "15 min" },
    { icon: Wifi, label: "Online" },
  ];

  return (
    <div className="flex items-center justify-center gap-6 text-muted-foreground">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2">
          <stat.icon className="w-4 h-4 text-primary/70" />
          <span className="text-sm">{stat.label}</span>
        </div>
      ))}
    </div>
  );
};
