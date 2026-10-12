export type ActionState<TField extends string = never> = {
  errors?: Partial<Record<TField, string[]>>;
  message?: string;
  success?: boolean;
} | null;
