export interface HacsListRepository {
  id: string;
  full_name: string;
}

export interface HacsList {
  id: string;
  name: string;
  builtin: boolean;
  repositories: HacsListRepository[];
}
