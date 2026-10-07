import blueImg from "@/assets/robot-blue.jpg";
import yellowImg from "@/assets/robot-yellow.jpg";
import pinkImg from "@/assets/robot-pink.jpg";
import greenImg from "@/assets/robot-green.jpg";

export type RobotId = "blue" | "yellow" | "pink" | "green";

export interface RobotDef {
  id: RobotId;
  /** Nama warna (Indonesia) */
  name: string;
  codename: string;
  color: string;
  glow: string;
  dark: string;
  image: string;
  power: number;
  speed: number;
  armor: number;
}

export const ROBOTS: RobotDef[] = [
  {
    id: "blue",
    name: "BIRU",
    codename: "STORM-X",
    color: "#3b82f6",
    glow: "#7dd3fc",
    dark: "#0b2a6b",
    image: blueImg,
    power: 4,
    speed: 5,
    armor: 3,
  },
  {
    id: "yellow",
    name: "KUNING",
    codename: "VOLT-7",
    color: "#facc15",
    glow: "#fde68a",
    dark: "#6b4a06",
    image: yellowImg,
    power: 5,
    speed: 4,
    armor: 3,
  },
  {
    id: "pink",
    name: "PINK",
    codename: "NOVA-9",
    color: "#ec4899",
    glow: "#f9a8d4",
    dark: "#6b1040",
    image: pinkImg,
    power: 3,
    speed: 5,
    armor: 4,
  },
  {
    id: "green",
    name: "HIJAU",
    codename: "TITAN-5",
    color: "#22c55e",
    glow: "#86efac",
    dark: "#0b4a22",
    image: greenImg,
    power: 4,
    speed: 3,
    armor: 5,
  },
];

export function getRobot(id: RobotId): RobotDef {
  return ROBOTS.find((r) => r.id === id) ?? ROBOTS[0];
}
