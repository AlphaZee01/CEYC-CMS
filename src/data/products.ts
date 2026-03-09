import stilettoBlack from "@/assets/products/stiletto-black-1.jpg";
import blockHeelRed from "@/assets/products/block-heel-red-1.jpg";
import platformBeige from "@/assets/products/platform-beige-1.jpg";
import wedgeGold from "@/assets/products/wedge-gold-1.jpg";
import stilettoNavy from "@/assets/products/stiletto-navy-1.jpg";
import blockHeelPink from "@/assets/products/block-heel-pink-1.jpg";
import platformWhite from "@/assets/products/platform-white-1.jpg";
import stilettoLeopard from "@/assets/products/stiletto-leopard-1.jpg";

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  size: number;
  brand: string;
  heelType: string;
  condition: "Like New" | "Excellent" | "Good" | "Fair";
  color: string;
  description: string;
  images: string[];
  inStock: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  rating: number;
  reviewCount: number;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Classic Black Patent Stilettos",
    price: 89,
    originalPrice: 450,
    size: 38,
    brand: "Jimmy Choo",
    heelType: "Stiletto",
    condition: "Excellent",
    color: "Black",
    description: "Timeless black patent leather stilettos by Jimmy Choo. These stunning heels feature a sleek pointed toe and a 4-inch heel. Minor wear on the sole, upper in excellent condition.",
    images: [stilettoBlack],
    inStock: true,
    isFeatured: true,
    isTrending: true,
    rating: 4.8,
    reviewCount: 24,
  },
  {
    id: "2",
    name: "Crimson Block Heel Pumps",
    price: 65,
    originalPrice: 320,
    size: 37,
    brand: "Valentino",
    heelType: "Block Heel",
    condition: "Like New",
    color: "Red",
    description: "Gorgeous red patent leather block heel pumps. Worn once for a photoshoot. Practically brand new condition with original box.",
    images: [blockHeelRed],
    inStock: true,
    isFeatured: true,
    isNewArrival: true,
    rating: 4.9,
    reviewCount: 18,
  },
  {
    id: "3",
    name: "Nude Strappy Platform Heels",
    price: 78,
    originalPrice: 380,
    size: 39,
    brand: "Stuart Weitzman",
    heelType: "Platform",
    condition: "Excellent",
    color: "Beige",
    description: "Elegant nude platform sandals with delicate strappy design. Perfect for special occasions. Minimal signs of wear.",
    images: [platformBeige],
    inStock: true,
    isTrending: true,
    isNewArrival: true,
    rating: 4.7,
    reviewCount: 31,
  },
  {
    id: "4",
    name: "Gold Metallic Wedge Heels",
    price: 55,
    originalPrice: 280,
    size: 38,
    brand: "Michael Kors",
    heelType: "Wedge",
    condition: "Good",
    color: "Gold",
    description: "Stunning gold metallic wedge heels with wooden wedge detail. Great statement piece for any outfit. Light scuffing on the toe.",
    images: [wedgeGold],
    inStock: true,
    isFeatured: true,
    rating: 4.5,
    reviewCount: 12,
  },
  {
    id: "5",
    name: "Navy Embellished Stilettos",
    price: 120,
    originalPrice: 650,
    size: 37,
    brand: "Manolo Blahnik",
    heelType: "Stiletto",
    condition: "Like New",
    color: "Navy",
    description: "Exquisite navy blue patent stilettos with crystal embellishment. A true collector's piece in pristine condition.",
    images: [stilettoNavy],
    inStock: true,
    isTrending: true,
    isFeatured: true,
    rating: 5.0,
    reviewCount: 8,
  },
  {
    id: "6",
    name: "Rose Suede Block Heels",
    price: 48,
    originalPrice: 220,
    size: 40,
    brand: "Steve Madden",
    heelType: "Block Heel",
    condition: "Good",
    color: "Pink",
    description: "Charming pink suede block heel pumps. Comfortable and stylish for all-day wear. Minor suede brushing.",
    images: [blockHeelPink],
    inStock: true,
    isNewArrival: true,
    rating: 4.3,
    reviewCount: 15,
  },
  {
    id: "7",
    name: "Bridal White Platform Sandals",
    price: 95,
    originalPrice: 420,
    size: 38,
    brand: "Christian Louboutin",
    heelType: "Platform",
    condition: "Excellent",
    color: "White",
    description: "Stunning white platform sandals perfect for bridal wear. D'Orsay style with peep toe. Excellent condition.",
    images: [platformWhite],
    inStock: true,
    isFeatured: true,
    isTrending: true,
    rating: 4.9,
    reviewCount: 22,
  },
  {
    id: "8",
    name: "Leopard Print Classic Pumps",
    price: 72,
    originalPrice: 350,
    size: 39,
    brand: "Christian Louboutin",
    heelType: "Stiletto",
    condition: "Excellent",
    color: "Leopard",
    description: "Iconic leopard print stiletto pumps. Calf hair upper in excellent condition. A bold fashion statement.",
    images: [stilettoLeopard],
    inStock: true,
    isNewArrival: true,
    isTrending: true,
    rating: 4.6,
    reviewCount: 19,
  },
  {
    id: "9",
    name: "Vintage Cream Kitten Heels",
    price: 42,
    originalPrice: 180,
    size: 36,
    brand: "Salvatore Ferragamo",
    heelType: "Stiletto",
    condition: "Good",
    color: "Beige",
    description: "Elegant vintage cream kitten heels from Ferragamo. Timeless design with low comfortable heel.",
    images: [platformBeige],
    inStock: true,
    rating: 4.4,
    reviewCount: 9,
  },
  {
    id: "10",
    name: "Midnight Velvet Block Heels",
    price: 58,
    originalPrice: 290,
    size: 38,
    brand: "Gucci",
    heelType: "Block Heel",
    condition: "Excellent",
    color: "Navy",
    description: "Luxurious midnight velvet block heel pumps by Gucci. Rich texture and beautiful color.",
    images: [stilettoNavy],
    inStock: true,
    isNewArrival: true,
    rating: 4.7,
    reviewCount: 14,
  },
  {
    id: "11",
    name: "Blush Satin Stilettos",
    price: 85,
    originalPrice: 400,
    size: 37,
    brand: "Jimmy Choo",
    heelType: "Stiletto",
    condition: "Like New",
    color: "Pink",
    description: "Delicate blush satin stilettos with pointed toe. Perfect for evening events.",
    images: [blockHeelPink],
    inStock: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 16,
  },
  {
    id: "12",
    name: "Tan Leather Wedge Sandals",
    price: 45,
    originalPrice: 200,
    size: 40,
    brand: "Tory Burch",
    heelType: "Wedge",
    condition: "Good",
    color: "Beige",
    description: "Casual-chic tan leather wedge sandals. Perfect for summer days and brunches.",
    images: [wedgeGold],
    inStock: true,
    rating: 4.2,
    reviewCount: 21,
  },
];

export const heelTypes = ["Stiletto", "Block Heel", "Platform", "Wedge"];
export const brands = ["Jimmy Choo", "Valentino", "Stuart Weitzman", "Michael Kors", "Manolo Blahnik", "Steve Madden", "Christian Louboutin", "Gucci", "Salvatore Ferragamo", "Tory Burch"];
export const conditions = ["Like New", "Excellent", "Good", "Fair"];
export const colors = ["Black", "Red", "Beige", "Gold", "Navy", "Pink", "White", "Leopard"];
export const sizes = [35, 36, 37, 38, 39, 40, 41, 42];
