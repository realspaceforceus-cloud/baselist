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
  availableOptions,
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
          {availableOptions.years.length > 0 ? (
            <Select
              value={filters.year || ""}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, year: value })
              }
            >
              <SelectTrigger id="filter-year" className="h-10 rounded-2xl">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
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
          )}
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="filter-make"
          >
            Make
          </label>
          {availableOptions.makes.length > 0 ? (
            <Select
              value={filters.make || ""}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, make: value })
              }
            >
              <SelectTrigger id="filter-make" className="h-10 rounded-2xl">
                <SelectValue placeholder="All makes" />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.makes.map((make) => (
                  <SelectItem key={make} value={make}>
                    {make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="filter-make"
              placeholder="e.g., Honda"
              value={filters.make || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, make: e.target.value })
              }
              className="h-10 rounded-2xl"
            />
          )}
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="filter-model"
          >
            Model
          </label>
          {availableOptions.models.length > 0 ? (
            <Select
              value={filters.model || ""}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, model: value })
              }
            >
              <SelectTrigger id="filter-model" className="h-10 rounded-2xl">
                <SelectValue placeholder="All models" />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="filter-model"
              placeholder="e.g., Civic"
              value={filters.model || ""}
              onChange={(e) =>
                onFiltersChange({ ...filters, model: e.target.value })
              }
              className="h-10 rounded-2xl"
            />
          )}
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
              {availableOptions.types.map((type) => (
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
              {availableOptions.colors.map((color) => (
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
