import carSkyline from "@/assets/car-skyline.jpg";
import car240z from "@/assets/car-240z.jpg";
import carSupra from "@/assets/car-supra.jpg";
import carRx7 from "@/assets/car-rx7.jpg";

export type VehicleStatus = "AVAILABLE" | "RESERVED" | "SOLD";

export interface Vehicle {
  id: string;
  img: string;
  name: string;
  chassis: string;
  year: number;
  priceJPY: number;
  mileage: string;
  mileageKm: number;
  grade: string;
  transmission: string;
  displacementCc: number;
  displacementLabel: string;
  status: VehicleStatus;
  featured?: boolean;
  stockNumber?: string;
  dateAdded?: string;
  images?: string[];
  description?: string;
  color?: string;
  repaired?: string;
  seatingCapacity?: number;
  driveSystem?: string;
  featuredOrder?: number;
}

export const inventory: Vehicle[] = [
  {
    id: "bnr34-1999",
    img: "https://danburgess.com/2026-assets/JDM/1999GTR-blue01.jpg",
    name: "Nissan Skyline GTR R34 V-Spec II",
    chassis: "BNR34",
    year: 1999,
    priceJPY: 22500000,
    mileage: "42,000 km",
    mileageKm: 42000,
    grade: "Auction Grade 4.5",
    transmission: "MT",
    displacementCc: 2600,
    displacementLabel: "2.6L",
    status: "RESERVED",
    featured: true,
    featuredOrder: 1,
    stockNumber: "J.6524",
    description: "The legendary R34 GT-R V-Spec II in iconic Bayside Blue. This example is in exceptional condition, featuring the carbon fiber hood and upgraded suspension from the factory. A true collector's piece with low mileage and documented service history.",
    color: "Bayside Blue",
    repaired: "No repair history",
    seatingCapacity: 4,
    driveSystem: "AWD",
    images: [
      'https://danburgess.com/2026-assets/JDM/1999GTR-blue01.jpg',
      'https://danburgess.com/2026-assets/JDM/1999GTR-blue02.jpg',
      'https://danburgess.com/2026-assets/JDM/1999GTR-blue03.jpg',
      'https://danburgess.com/2026-assets/JDM/1999GTR-blue04.jpg',
      'https://danburgess.com/2026-assets/JDM/1999GTR-blue05.jpg',
      'https://danburgess.com/2026-assets/JDM/1999GTR-blue06.jpg',
      'https://danburgess.com/2026-assets/JDM/1999GTR-blue07.jpg',
      'https://danburgess.com/2026-assets/JDM/1999GTR-blue08.jpg',
      'https://danburgess.com/2026-assets/JDM/1999GTR-blue09.jpg'
    ]
  },
  {
    id: "s30-1971",
    img: "https://danburgess.com/2026-assets/JDM/1971-240Z01.jpg",
    name: "Nissan Fairlady Z",
    chassis: "S30 240Z",
    year: 1971,
    priceJPY: 8200000,
    mileage: "42,000 km",
    mileageKm: 42000,
    grade: "Auction Grade 4.0",
    transmission: "MT",
    displacementCc: 2400,
    displacementLabel: "2.4L",
    status: "AVAILABLE",
    featured: true,
    featuredOrder: 2,
    stockNumber: "J.6511",
    description: "A beautifully preserved 1971 S30 Fairlady Z. This vehicle features the original L24 engine and has undergone a sympathetic restoration to maintain its period-correct charm. Perfect for the enthusiast looking for a classic JDM driving experience.",
    color: "Maroon",
    repaired: "Fully restored",
    seatingCapacity: 2,
    driveSystem: "RWD",
    images: [
      'https://danburgess.com/2026-assets/JDM/1971-240Z01.jpg',
      'https://danburgess.com/2026-assets/JDM/1971-240Z02.jpg',
      'https://danburgess.com/2026-assets/JDM/1971-240Z03.jpg',
      'https://danburgess.com/2026-assets/JDM/1971-240Z04.jpg',
      'https://danburgess.com/2026-assets/JDM/1971-240Z05.jpg',
      'https://danburgess.com/2026-assets/JDM/1971-240Z06.jpg',
      'https://danburgess.com/2026-assets/JDM/1971-240Z07.jpg',
      'https://danburgess.com/2026-assets/JDM/1971-240Z08.jpg',
      'https://danburgess.com/2026-assets/JDM/1971-240Z09.jpg'
    ]
  },
  {
    id: "jza80-1997",
    img: "https://danburgess.com/2026-assets/JDM/1997Supra-wht01.jpg",
    name: "Toyota Supra RZ Turbo",
    chassis: "JZA80 MK4",
    year: 1997,
    priceJPY: 13900000,
    mileage: "102,500 km",
    mileageKm: 102500,
    grade: "Auction Grade 4.5",
    transmission: "MT",
    displacementCc: 3000,
    displacementLabel: "3.0L",
    status: "AVAILABLE",
    featured: true,
    featuredOrder: 3,
    stockNumber: "J.6526",
    description: "The ultimate 90s JDM icon. This Supra RZ Turbo comes with the legendary 2JZ-GTE engine and 6-speed Getrag manual transmission. Mostly stock with only tasteful reliability upgrades. A rare find in this condition.",
    color: "Super White II",
    repaired: "No repair history",
    seatingCapacity: 4,
    driveSystem: "RWD",
    images: [
      'https://danburgess.com/2026-assets/JDM/1997Supra-wht01.jpg',
      'https://danburgess.com/2026-assets/JDM/1997Supra-wht02.jpg',
      'https://danburgess.com/2026-assets/JDM/1997Supra-wht03.jpg',
      'https://danburgess.com/2026-assets/JDM/1997Supra-wht04.jpg',
      'https://danburgess.com/2026-assets/JDM/1997Supra-wht05.jpg',
      'https://danburgess.com/2026-assets/JDM/1997Supra-wht06.jpg',
      'https://danburgess.com/2026-assets/JDM/1997Supra-wht07.jpg',
      'https://danburgess.com/2026-assets/JDM/1997Supra-wht08.jpg',
      'https://danburgess.com/2026-assets/JDM/1997Supra-wht09.jpg'
    ]
  },
  {
    id: "sw20-1996",
    img: "https://danburgess.com/2026-assets/JDM/1996-ToyotaMR201.jpg",
    name: "Toyota MR2",
    chassis: "SW20",
    year: 1996,
    priceJPY: 2300000,
    mileage: "145,000 km",
    mileageKm: 145000,
    grade: "Auction Grade 4.0",
    transmission: "AT",
    displacementCc: 2000,
    displacementLabel: "2.0L",
    status: "SOLD",
    featured: true,
    featuredOrder: 4,
    stockNumber: "J.6502",
    description: "A fun and engaging mid-engine sports car. This MR2 (SW20) is the naturally aspirated version, offering balanced handling and great reliability. Recently serviced and ready for its next owner.",
    color: "Super Red II",
    repaired: "Minor panel repair",
    seatingCapacity: 2,
    driveSystem: "RWD",
    images: [
      'https://danburgess.com/2026-assets/JDM/1996-ToyotaMR201.jpg',
      'https://danburgess.com/2026-assets/JDM/1996-ToyotaMR202.jpg',
      'https://danburgess.com/2026-assets/JDM/1996-ToyotaMR203.jpg',
      'https://danburgess.com/2026-assets/JDM/1996-ToyotaMR204.jpg',
      'https://danburgess.com/2026-assets/JDM/1996-ToyotaMR205.jpg'
    ]
  },
  {
    id: "bnr32-1992",
    img: carSkyline,
    name: "Nissan Skyline GT-R",
    chassis: "BNR32",
    year: 1992,
    priceJPY: 11000000,
    mileage: "78,400 km",
    mileageKm: 78400,
    grade: "Auction Grade 4",
    transmission: "5-Speed Manual",
    displacementCc: 2568,
    displacementLabel: "2.6L Twin-Turbo",
    status: "AVAILABLE",
    featured: true,
    stockNumber: "J.6529",
    description: "The BNR32 GT-R that earned the nickname 'Godzilla'. This example is remarkably well-preserved with low mileage for its age. Features the legendary RB26DETT and ATTESA E-TS AWD system. Recent maintenance includes timing belt and fluid service.",
    color: "Gun Grey Metallic",
    repaired: "No repair history",
    seatingCapacity: 4,
    driveSystem: "AWD",
  },
  {
    id: "ae86-1985",
    img: car240z,
    name: "Toyota Sprinter Trueno",
    chassis: "AE86",
    year: 1985,
    priceJPY: 6150000,
    mileage: "143,700 km",
    mileageKm: 143700,
    grade: "Auction Grade 3.5",
    transmission: "5-Speed Manual",
    displacementCc: 1587,
    displacementLabel: "1.6L Inline-4",
    status: "AVAILABLE",
    featured: true,
    stockNumber: "J.6532",
    description: "The legendary Hachi-Roku Trueno. This AE86 features the iconic pop-up headlights and the high-revving 4A-GE engine. Known for its perfect balance and drifting heritage, this example has been maintained to a high standard.",
    color: "White/Black Panda",
    repaired: "Minor panel repair",
    seatingCapacity: 4,
    driveSystem: "RWD",
  },
];

export const statusStyles: Record<VehicleStatus, string> = {
  AVAILABLE: "bg-success/15 text-success border-success/30",
  RESERVED: "bg-primary/15 text-bronze border-primary/40",
  SOLD: "bg-destructive/15 text-destructive border-destructive/40",
};
