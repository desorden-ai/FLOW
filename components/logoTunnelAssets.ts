export type LogoTunnelAsset = {
  name: string;
  alt: string;
  src: string;
  initialZ: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const BASE_PATH = "/media/clients/logo-tunnel";

export const LOGO_TUNNEL_ASSETS: readonly LogoTunnelAsset[] = [
  {
    name: "Pugnator",
    alt: "Logotip de Pugnator, client o projecte de DESORDEN",
    src: `${BASE_PATH}/1000091506_dark_optimized.webp`,
    initialZ: -1000,
    x: 20,
    y: 30,
    width: 1000,
    height: 1000,
  },
  {
    name: "Castell",
    alt: "Logotip de Castell, client o projecte de DESORDEN",
    src: `${BASE_PATH}/1000091515_dark_optimized.webp`,
    initialZ: -2500,
    x: 70,
    y: 20,
    width: 1000,
    height: 1000,
  },
  {
    name: "The Club Padel",
    alt: "Logotip de The Club Padel, client o projecte de DESORDEN",
    src: `${BASE_PATH}/1000091516_dark_optimized.webp`,
    initialZ: -4000,
    x: 30,
    y: 70,
    width: 1000,
    height: 1000,
  },
  {
    name: "VIU Sant Vicenç de Castellet",
    alt: "Logotip de VIU Sant Vicenç de Castellet, client o projecte de DESORDEN",
    src: `${BASE_PATH}/1000091520_dark_optimized.webp`,
    initialZ: -5500,
    x: 75,
    y: 60,
    width: 1000,
    height: 1000,
  },
  {
    name: "Pata Negra",
    alt: "Logotip de Pata Negra, client o projecte de DESORDEN",
    src: `${BASE_PATH}/1000091519_dark_optimized.webp`,
    initialZ: -7000,
    x: 15,
    y: 50,
    width: 1000,
    height: 1000,
  },
  {
    name: "NTK",
    alt: "Logotip de NTK, client o projecte de DESORDEN",
    src: `${BASE_PATH}/1000091541_dark_optimized.webp`,
    initialZ: -8500,
    x: 55,
    y: 85,
    width: 1000,
    height: 1000,
  },
  {
    name: "Nutrikom",
    alt: "Logotip de Nutrikom, client o projecte de DESORDEN",
    src: `${BASE_PATH}/1000091543_dark_optimized.webp`,
    initialZ: -10000,
    x: 45,
    y: 25,
    width: 1000,
    height: 752,
  },
] as const;
