import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiDelete, mdiOpenInNew, mdiPencil } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import { navigate } from "../../../homeassistant-frontend/src/common/navigate";
import { showConfirmationDialog } from "../../../homeassistant-frontend/src/dialogs/generic/show-dialog-box";
import "../../../homeassistant-frontend/src/components/ha-dialog";
import { createCloseHeading } from "../../../homeassistant-frontend/src/components/ha-dialog";
import "../../../homeassistant-frontend/src/components/ha-svg-icon";
import { mainWindow } from "../../../homeassistant-frontend/src/common/dom/get_main_window";
import type { HomeAssistant } from "../../../homeassistant-frontend/src/types";
import type { HacsList } from "../../data/lists";
import {
  createList,
  deleteList,
  getLists,
  renameList,
  setRepositoryLists,
} from "../../data/websocket";
import type { RepositoryBase } from "../../data/repository";
import {
  showHacsFormDialog,
  type HacsListsDialogParams,
} from "./show-hacs-dialog";

@customElement("hacs-lists-dialog")
export class HacsListsDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: HacsListsDialogParams;
  @state() private _lists: HacsList[] = [];
  @state() private _selectedListId?: string;
  @state() private _waiting = false;

  public async showDialog(dialogParams: HacsListsDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    await this._loadLists();
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    this._lists = [];
    this._selectedListId = undefined;
    this._waiting = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _loadLists(): Promise<void> {
    this._waiting = true;
    try {
      this._lists = await getLists(this.hass);

      if (
        !this._selectedListId ||
        !this._lists.some((list) => list.id === this._selectedListId)
      ) {
        this._selectedListId = this._lists[0]?.id;
      }
    } finally {
      this._waiting = false;
    }
  }

  private _selectedList(): HacsList | undefined {
    return this._lists.find((list) => list.id === this._selectedListId);
  }

  private _createList(): void {
    if (!this._dialogParams) {
      return;
    }

    showHacsFormDialog(this, {
      hacs: this._dialogParams.hacs,
      title: this._dialogParams.hacs.localize("dialog_lists.create"),
      schema: [
        {
          name: "name",
          required: true,
          selector: {
            text: {},
          },
        },
      ],
      data: {
        name: "",
      },
      saveAction: async (data) => {
        const lists = await createList(this.hass, String(data.name || ""));
        this._lists = lists;
        this._selectedListId = lists[lists.length - 1]?.id;
      },
    });
  }

  private _renameList(list: HacsList): void {
    if (!this._dialogParams || list.builtin) {
      return;
    }

    showHacsFormDialog(this, {
      hacs: this._dialogParams.hacs,
      title: this._dialogParams.hacs.localize("dialog_lists.rename"),
      schema: [
        {
          name: "name",
          required: true,
          selector: {
            text: {},
          },
        },
      ],
      data: {
        name: list.name,
      },
      saveAction: async (data) => {
        this._lists = await renameList(
          this.hass,
          list.id,
          String(data.name || ""),
        );
      },
    });
  }

  private async _deleteList(list: HacsList): Promise<void> {
    if (list.builtin || !this._dialogParams) {
      return;
    }

    await showConfirmationDialog(this, {
      title: this._dialogParams.hacs.localize("dialog_lists.delete"),
      text: this._dialogParams.hacs.localize("dialog_lists.delete_confirm", { name: list.name }),
      confirmText: this._dialogParams.hacs.localize("dialog_lists.delete"),
      dismissText: this._dialogParams.hacs.localize("common.cancel"),
      confirm: async () => {
        this._waiting = true;
        try {
          this._lists = await deleteList(this.hass, list.id);
          this._selectedListId = this._lists[0]?.id;
        } finally {
          this._waiting = false;
        }
      },
    });
  }

  private async _removeRepository(repositoryId: string): Promise<void> {
    const selectedList = this._selectedList();
    if (!selectedList) {
      return;
    }

    const remainingListIds = this._lists
      .filter((list) =>
        list.repositories.some(
          (repository) => String(repository.id) === String(repositoryId),
        ),
      )
      .map((list) => list.id)
      .filter((listId) => listId !== selectedList.id);

    this._waiting = true;
    try {
      this._lists = await setRepositoryLists(
        this.hass,
        String(repositoryId),
        remainingListIds,
      );
    } finally {
      this._waiting = false;
    }
  }

  private _openRepository(repository: RepositoryBase | undefined, fullName: string): void {
    if (repository) {
      this.closeDialog();
      navigate(`/hacs/repository/${repository.id}`);
      return;
    }

    mainWindow.open(
      `https://github.com/${fullName}`,
      "_blank",
      "noreferrer=true",
    );
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    const selectedList = this._selectedList();

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._dialogParams.hacs.localize("dialog_lists.title"),
        )}
        @closed=${this.closeDialog}
      >
        <div class="layout">
          <div class="lists-column">
            <div class="column-header">
              <strong>${this._dialogParams.hacs.localize("dialog_lists.title")}</strong>
              <mwc-button @click=${this._createList}>+ ${this._dialogParams.hacs.localize("dialog_lists.create")}</mwc-button>
            </div>

            <div class="lists">
              ${this._lists.map(
                (list) => html`
                  <div
                    class="list-row ${list.id === this._selectedListId ? "selected" : ""}"
                    @click=${() => (this._selectedListId = list.id)}
                  >
                    <div class="list-name">
                      <span>${list.name}${list.builtin ? " ⭐" : ""}</span>
                      <small>${list.repositories.length}</small>
                    </div>

                    ${list.builtin
                      ? nothing
                      : html`
                          <div class="list-actions">
                            <mwc-icon-button
                              .title=${this._dialogParams!.hacs.localize("dialog_lists.rename")}
                              @click=${(event: Event) => {
                                event.stopPropagation();
                                this._renameList(list);
                              }}
                            >
                              <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                            </mwc-icon-button>
                            <mwc-icon-button
                              .title=${this._dialogParams!.hacs.localize("dialog_lists.delete")}
                              @click=${(event: Event) => {
                                event.stopPropagation();
                                this._deleteList(list);
                              }}
                            >
                              <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                            </mwc-icon-button>
                          </div>
                        `}
                  </div>
                `,
              )}
            </div>
          </div>

          <div class="repositories-column">
            ${selectedList
              ? html`
                  <div class="column-header">
                    <strong>${selectedList.name}</strong>
                    <span>${this._dialogParams.hacs.localize("dialog_lists.saved", { count: selectedList.repositories.length })}</span>
                  </div>

                  <div class="repositories">
                    ${selectedList.repositories.length
                      ? selectedList.repositories.map((savedRepository) => {
                          const repository = this._dialogParams!.hacs.repositories.find(
                            (candidate) =>
                              String(candidate.id) === String(savedRepository.id),
                          );

                          return html`
                            <div class="repository-row">
                              <div class="repository-info">
                                <strong>
                                  ${repository?.name || savedRepository.full_name}
                                </strong>
                                <div class="secondary">
                                  ${savedRepository.full_name}
                                  ${repository
                                    ? repository.installed
                                      ? ` · ${this._dialogParams!.hacs.localize("dialog_lists.installed")}`
                                      : ` · ${this._dialogParams!.hacs.localize("dialog_lists.not_installed")}`
                                    : ` · ${this._dialogParams!.hacs.localize("dialog_lists.unavailable")}`}
                                </div>
                              </div>

                              <div class="repository-actions">
                                <mwc-icon-button
                                  .title=${this._dialogParams!.hacs.localize("dialog_lists.open")}
                                  @click=${() =>
                                    this._openRepository(
                                      repository,
                                      savedRepository.full_name,
                                    )}
                                >
                                  <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
                                </mwc-icon-button>

                                ${repository
                                  ? html`
                                      <mwc-button
                                        @click=${() =>
                                          this._removeRepository(String(repository.id))}
                                        .disabled=${this._waiting}
                                      >
                                        ${this._dialogParams!.hacs.localize("common.remove")}
                                      </mwc-button>
                                    `
                                  : nothing}
                              </div>
                            </div>
                          `;
                        })
                      : html`<div class="empty">${this._dialogParams.hacs.localize("dialog_lists.empty")}</div>`}
                  </div>
                `
              : html`<div class="empty">${this._dialogParams.hacs.localize("dialog_lists.no_lists")}</div>`}
          </div>
        </div>

        ${this._waiting
          ? html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
          : nothing}

        <mwc-button
          slot="primaryAction"
          @click=${this.closeDialog}
          .disabled=${this._waiting}
        >
          ${this._dialogParams.hacs.localize("dialog_lists.close")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  static get styles() {
    return css`
      .layout {
        display: grid;
        grid-template-columns: minmax(180px, 240px) minmax(360px, 1fr);
        gap: 24px;
        min-width: min(760px, 85vw);
        max-width: 1000px;
        max-height: 65vh;
      }

      .lists-column,
      .repositories-column {
        min-width: 0;
      }

      .lists-column {
        border-right: 1px solid var(--divider-color);
        padding-right: 16px;
      }

      .column-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 12px;
      }

      .lists,
      .repositories {
        overflow: auto;
        max-height: calc(65vh - 70px);
      }

      .list-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 48px;
        padding: 4px 8px;
        border-radius: 8px;
        cursor: pointer;
      }

      .list-row:hover,
      .list-row.selected {
        background: var(--secondary-background-color);
      }

      .list-name {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      .list-name small,
      .column-header span {
        color: var(--secondary-text-color);
      }

      .list-actions {
        display: flex;
        align-items: center;
      }

      .repository-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid var(--divider-color);
      }

      .repository-info {
        min-width: 0;
      }

      .secondary {
        color: var(--secondary-text-color);
        overflow-wrap: anywhere;
        margin-top: 4px;
      }

      .repository-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }

      .empty {
        color: var(--secondary-text-color);
        padding: 24px 0;
      }

      mwc-linear-progress {
        margin: 8px -8px -8px;
      }

      @media all and (max-width: 700px) {
        .layout {
          grid-template-columns: 1fr;
          min-width: 0;
          max-width: 100%;
        }

        .lists-column {
          border-right: 0;
          border-bottom: 1px solid var(--divider-color);
          padding-right: 0;
          padding-bottom: 16px;
        }

        .lists {
          max-height: 180px;
        }

        .repositories {
          max-height: 40vh;
        }

        .repository-row {
          align-items: flex-start;
          flex-direction: column;
        }

        .repository-actions {
          width: 100%;
          justify-content: flex-end;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hacs-lists-dialog": HacsListsDialog;
  }
}
