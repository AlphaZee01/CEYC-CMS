import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { products, heelTypes, brands, conditions, colors, sizes } from "@/data/products";
import ProductCard from "@/components/ProductCard";

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);

  const toggleFilter = <T,>(arr: T[], item: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    setter((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.brand.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedTypes.length && !selectedTypes.includes(p.heelType)) return false;
      if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false;
      if (selectedConditions.length && !selectedConditions.includes(p.condition)) return false;
      if (selectedColors.length && !selectedColors.includes(p.color)) return false;
      if (selectedSizes.length && !selectedSizes.includes(p.size)) return false;
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      return true;
    });

    switch (sortBy) {
      case "price-low": result.sort((a, b) => a.price - b.price); break;
      case "price-high": result.sort((a, b) => b.price - a.price); break;
      case "rating": result.sort((a, b) => b.rating - a.rating); break;
    }
    return result;
  }, [search, sortBy, selectedTypes, selectedBrands, selectedConditions, selectedColors, selectedSizes, priceRange]);

  const activeFilterCount = selectedTypes.length + selectedBrands.length + selectedConditions.length + selectedColors.length + selectedSizes.length;

  const FilterSection = ({ title, items, selected, onToggle }: { title: string; items: string[]; selected: string[]; onToggle: (item: string) => void }) => (
    <div className="mb-6">
      <h4 className="text-xs tracking-widest uppercase font-body font-semibold mb-3">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onToggle(item)}
            className={`px-3 py-1.5 text-xs font-body rounded-sm border transition-colors ${
              selected.includes(item) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-gold"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-beige py-12">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <h1 className="font-display text-3xl md:text-4xl mb-2">Shop All Heels</h1>
          <p className="text-sm text-muted-foreground font-body">{filtered.length} products</p>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search heels..."
              className="w-full bg-secondary pl-10 pr-4 py-2.5 text-sm font-body rounded-sm focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-secondary px-4 py-2.5 text-sm font-body rounded-sm focus:outline-none focus:ring-1 focus:ring-gold"
          >
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-body rounded-sm border transition-colors ${
              filtersOpen ? "bg-primary text-primary-foreground" : "border-border hover:border-gold"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-gold text-gold-foreground w-5 h-5 rounded-full text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 p-6 bg-secondary rounded-sm overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
              <FilterSection title="Heel Type" items={heelTypes} selected={selectedTypes} onToggle={(item) => toggleFilter(selectedTypes, item, setSelectedTypes)} />
              <FilterSection title="Brand" items={brands.slice(0, 6)} selected={selectedBrands} onToggle={(item) => toggleFilter(selectedBrands, item, setSelectedBrands)} />
              <FilterSection title="Condition" items={conditions} selected={selectedConditions} onToggle={(item) => toggleFilter(selectedConditions, item, setSelectedConditions)} />
              <FilterSection title="Color" items={colors} selected={selectedColors} onToggle={(item) => toggleFilter(selectedColors, item, setSelectedColors)} />
              <div className="mb-6">
                <h4 className="text-xs tracking-widest uppercase font-body font-semibold mb-3">Size</h4>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleFilter(selectedSizes, size, setSelectedSizes)}
                      className={`w-10 h-10 text-xs font-body rounded-sm border transition-colors ${
                        selectedSizes.includes(size) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-gold"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSelectedTypes([]); setSelectedBrands([]); setSelectedConditions([]); setSelectedColors([]); setSelectedSizes([]); }}
                className="text-xs text-muted-foreground font-body underline hover:text-foreground transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </motion.div>
        )}

        {/* Product Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-body">No products match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
