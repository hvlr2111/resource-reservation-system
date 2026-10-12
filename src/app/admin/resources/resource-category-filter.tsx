"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminResourceCategoryFilter({
  categories,
  selectedCategory,
}: {
  categories: { id: string; name: string }[];
  selectedCategory: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateCategory(category: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (typeof category === "string" && category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    const query = params.toString();
    router.push(`/admin/resources${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="admin-resource-category" className="text-sm">
        Category
      </label>
      <Select
        value={selectedCategory || "all"}
        onValueChange={(value) =>
          updateCategory(value === "all" ? "" : (value ?? ""))
        }
      >
        <SelectTrigger id="admin-resource-category" className="w-full sm:w-[220px]">
          <SelectValue placeholder="All categories">
            {selectedCategory
              ? categories.find((category) => category.id === selectedCategory)
                  ?.name ?? "All categories"
              : "All categories"}
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
  );
}
