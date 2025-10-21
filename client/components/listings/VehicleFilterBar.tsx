import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VehicleOptions } from "@/lib/vehicleUtils";

interface VehicleFilters {
  year?: string;
  make?: string;
  model?: string;
  type?: string;
  color?: string;
  maxMiles?: string;
}

interface VehicleFilterBarProps {
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
  availableOptions: VehicleOptions;
}

export const VehicleFilterBar = ({
  filters,
  onFiltersChange,
}: VehicleFilterBarProps): JSX.Element => {
  const handleClear = () => {
    onFiltersChange({
      year: "",
      make: "",
      model: "",
      type: "",
      color: "",
      maxMiles: "",
    });
  };

  const hasActiveFilters =
    filters.year ||
    filters.make ||
    filters.model ||
    filters.type ||
    filters.color ||
    filters.maxMiles;

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Vehicle Filters
        </h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-primary hover:underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="filter-year"
          >
            Year
          </label>
          <Input
            id="filter-year"
            type="number"
            placeholder="e.g., 2020"
            value={filters.year || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, year: e.target.value })
            }
            className="h-10 rounded-2xl"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="filter-make"
          >
            Make
          </label>
          <Input
            id="filter-make"
            placeholder="e.g., Honda"
            value={filters.make || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, make: e.target.value })
            }
            className="h-10 rounded-2xl"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="filter-model"
          >
            Model
          </label>
          <Input
            id="filter-model"
            placeholder="e.g., Civic"
            value={filters.model || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, model: e.target.value })
            }
            className="h-10 rounded-2xl"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="filter-type"
          >
            Type
          </label>
          <Select
            value={filters.type || ""}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, type: value })
            }
          >
            <SelectTrigger id="filter-type" className="h-10 rounded-2xl">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="filter-color"
          >
            Color
          </label>
          <Select
            value={filters.color || ""}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, color: value })
            }
          >
            <SelectTrigger id="filter-color" className="h-10 rounded-2xl">
              <SelectValue placeholder="All colors" />
            </SelectTrigger>
            <SelectContent>
              {vehicleColors.map((color) => (
                <SelectItem key={color} value={color}>
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="filter-miles"
          >
            Max Miles
          </label>
          <Input
            id="filter-miles"
            type="number"
            placeholder="e.g., 100000"
            value={filters.maxMiles || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, maxMiles: e.target.value })
            }
            className="h-10 rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
};
