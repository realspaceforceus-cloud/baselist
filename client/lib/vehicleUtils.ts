import type { Listing, VehicleOptions } from "@/types";

export const extractVehicleOptions = (listings: Listing[]): VehicleOptions => {
  const vehicleListings = listings.filter((l) => l.category === "Vehicles");

  const years = new Set<string>();
  const makes = new Set<string>();
  const models = new Set<string>();
  const types = new Set<string>();
  const colors = new Set<string>();

  vehicleListings.forEach((listing) => {
    if (listing.vehicleYear) years.add(listing.vehicleYear);
    if (listing.vehicleMake) makes.add(listing.vehicleMake);
    if (listing.vehicleModel) models.add(listing.vehicleModel);
    if (listing.vehicleType) types.add(listing.vehicleType);
    if (listing.vehicleColor) colors.add(listing.vehicleColor);
  });

  const defaultTypes = [
    "Sedan",
    "SUV",
    "Truck",
    "Van",
    "Coupe",
    "Hatchback",
    "Wagon",
    "Convertible",
    "Minivan",
    "Other",
  ];

  const defaultColors = [
    "Black",
    "White",
    "Silver",
    "Gray",
    "Red",
    "Blue",
    "Brown",
    "Green",
    "Gold",
    "Beige",
    "Orange",
    "Purple",
  ];

  return {
    years: Array.from(years).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      return numB - numA;
    }),
    makes: Array.from(makes).sort(),
    models: Array.from(models).sort(),
    types:
      Array.from(types).length > 0 ? Array.from(types).sort() : defaultTypes,
    colors:
      Array.from(colors).length > 0 ? Array.from(colors).sort() : defaultColors,
  };
};
