"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResourceFiltersProps {
  categories: { id: string; name: string }[];
  searchParams: { search?: string; category?: string };
}

export function ResourceFilters({ categories, searchParams }: ResourceFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.search || "");

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(params.toString());
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    router.push(`/resources?${newParams.toString()}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("search", searchValue);
  };

  // Find the category name for the selected category ID
  const selectedCategory = categories.find(
    (cat) => cat.id === searchParams.category
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row">
        <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 gap-2">
          <Input
            aria-label="Search resources by name"
            placeholder="Search resources..."
            className="min-w-0 max-w-sm flex-1"
            value={searchValue}
            onChange={handleSearchChange}
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Select
          value={searchParams.category || "all"}
          onValueChange={(value) =>
            updateFilter("category", value === "all" ? "" : (value ?? ""))
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All categories">
              {searchParams.category === "all" || !searchParams.category
                ? "All categories"
                : selectedCategory?.name || "All categories"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
