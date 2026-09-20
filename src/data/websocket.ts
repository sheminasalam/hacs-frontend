import type { HomeAssistant } from "../../homeassistant-frontend/src/types";
import type { Hacs, HacsInfo } from "./hacs";
import type { HacsDispatchEvent } from "./common";
import type { RepositoryBase } from "./repository";

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

export const fetchHacsInfo = async (hass: HomeAssistant) =>
  hass.connection.sendMessagePromise<HacsInfo>({
    type: "hacs/info",
  });

export const getRepositories = async (hass: HomeAssistant) =>
  hass.connection.sendMessagePromise<RepositoryBase[]>({
    type: "hacs/repositories/list",
  });

export const getLists = async (hass: HomeAssistant) =>
  hass.connection.sendMessagePromise<HacsList[]>({
    type: "hacs/lists/list",
  });

export const createList = async (hass: HomeAssistant, name: string) =>
  hass.connection.sendMessagePromise<HacsList[]>({
    type: "hacs/lists/create",
    name,
  });

export const renameList = async (hass: HomeAssistant, listId: string, name: string) =>
  hass.connection.sendMessagePromise<HacsList[]>({
    type: "hacs/lists/rename",
    list_id: listId,
    name,
  });

export const deleteList = async (hass: HomeAssistant, listId: string) =>
  hass.connection.sendMessagePromise<HacsList[]>({
    type: "hacs/lists/delete",
    list_id: listId,
  });

export const setRepositoryLists = async (
  hass: HomeAssistant,
  repository: string,
  lists: string[],
) =>
  hass.connection.sendMessagePromise<HacsList[]>({
    type: "hacs/lists/set_repository",
    repository,
    lists,
  });

export const repositoryUninstall = async (hass: HomeAssistant, repository: string) =>
  hass.connection.sendMessagePromise<void>({
    type: "hacs/repository/remove",
    repository,
  });

export const repositoryAdd = async (hass: HomeAssistant, repository: string, category: string) =>
  hass.connection.sendMessagePromise<null | Record<string, string>>({
    type: "hacs/repositories/add",
    repository: repository,
    category,
  });

export const repositoryUpdate = async (hass: HomeAssistant, repository: string) =>
  hass.connection.sendMessagePromise<void>({
    type: "hacs/repository/refresh",
    repository,
  });

export const repositoryDelete = async (hass: HomeAssistant, repository: string) =>
  hass.connection.sendMessagePromise<void>({
    type: "hacs/repositories/remove",
    repository,
  });

export const repositoriesClearNew = async (hass: HomeAssistant, hacs: Hacs) =>
  hass.connection.sendMessagePromise<void>({
    type: "hacs/repositories/clear_new",
    categories: hacs.info.categories,
  });

export const repositoriesClearNewRepository = async (hass: HomeAssistant, repository: string) =>
  hass.connection.sendMessagePromise<void>({
    type: "hacs/repositories/clear_new",
    repository,
  });

export const websocketSubscription = (
  hass: HomeAssistant,
  onChange: (result: Record<any, any> | null) => void,
  event: HacsDispatchEvent,
) =>
  hass.connection.subscribeMessage(onChange, {
    type: "hacs/subscribe",
    signal: event,
  });
