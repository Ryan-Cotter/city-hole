export const cityThemes = [
  {
    name: "Medieval",
    subtitle: "Stone & timber",
    road: "#8c8069",
    ground: "#b7aa86",
    facade: "#c8b58f",
    roof: "#88563f",
  },
  {
    name: "Industrial",
    subtitle: "Steam & brick",
    road: "#554f4a",
    ground: "#aaa294",
    facade: "#a5674d",
    roof: "#50575a",
  },
  {
    name: "Modern",
    subtitle: "Concrete & glass",
    road: "#394b69",
    ground: "#cdd8e5",
    facade: "#b5ada0",
    roof: "#647680",
  },
  {
    name: "Futuristic",
    subtitle: "Neon & orbit",
    road: "#263648",
    ground: "#7c929e",
    facade: "#8eafbd",
    roof: "#46dcda",
  },
] as const;
export const themeForCity = (index: number) =>
  cityThemes[Math.min(cityThemes.length - 1, Math.max(0, index))];
export const boostConfig = {
  duration: 10,
  speedMultiplier: 1.8,
};
