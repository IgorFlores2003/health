import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.ritmo.health",
  appName: "Ritmo",
  webDir: "dist",
  plugins: {
    // Ícone das notificações na barra de status (res/drawable/ic_stat_ritmo).
    LocalNotifications: {
      smallIcon: "ic_stat_ritmo",
      iconColor: "#D91C1C",
    },
  },
};
export default config;
