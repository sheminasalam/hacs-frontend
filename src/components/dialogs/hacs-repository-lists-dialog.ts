import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../homeassistant-frontend/src/common/dom/fire_event";
import "../../../homeassistant-frontend/src/components/ha-dialog";
import { createCloseHeading } from "../../../homeassistant-frontend/src/components/ha-dialog";
import type { HomeAssistant } from "../../../homeassistant-frontend/src/types";
import type { HacsList } from "../../data/lists";
import {
  createList,
  getLists,
  setRepositoryLists,
} from "../../data/websocket";
import { showHacsFormDialog, type HacsRepositoryListsDialogParams } from "./show-hacs-dialog";

@customElement("hacs-repository-lists-dialog")
export class HacsRepositoryListsDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: HacsRepositoryListsDialogParams;
  @state() private _lists: HacsList[] = [];
  @state() private _selectedListIds = new Set<string>();
  @state() private _waiting = false;

  public async showDialog(dialogParams: HacsRepositoryListsDialogParams): Promise<void> {
    this._dialogParams = dialogParams;
    await this._loadLists();
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    this._lists = [];
    this._selectedListIds = new Set<string>();
    this._waiting = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _loadLists(): Promise<void> {
    if (!this._dialogParams) {
      return;
    }

    this._waiting = true;
    try {
      const lists = await getLists(this.hass);
      this._lists = lists;

      const repositoryId = String(this._dialogParams.repositoryId);
      this._selectedListIds = new Set(
        lists
          .filter((list) =>
            list.repositories.some(
              (repository) => String(repository.id) === repositoryId,
            ),
          )
          .map((list) => list.id),
      );
    } finally {
      this._waiting = false;
    }
  }

  private _toggleList(listId: string): void {
    const selected = new Set(this._selectedListIds);
    if (selected.has(listId)) {
      selected.delete(listId);
    } else {
      selected.add(listId);
    }
    this._selectedListIds = selected;
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

        const created = lists[lists.length - 1];
        if (created) {
          this._selectedListIds = new Set([
            ...this._selectedListIds,
            created.id,
          ]);
        }
      },
    });
  }

  private async _save(): Promise<void> {
    if (!this._dialogParams) {
      return;
    }

    this._waiting = true;

    try {
      await setRepositoryLists(
        this.hass,
        String(this._dialogParams.repositoryId),
        [...this._selectedListIds],
      );
      this.closeDialog();
    } finally {
      this._waiting = false;
    }
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, this._dialogParams.hacs.localize("dialog_lists.add_to_lists"))}
        @closed=${this.closeDialog}
      >
        <div class="content">
          <div class="actions">
            <mwc-button @click=${this._createList}>+ ${this._dialogParams.hacs.localize("dialog_lists.create")}</mwc-button>
          </div>

          <div class="list">
            ${this._lists.map(
              (list) => html`
                <label class="list-row">
                  <input
                    type="checkbox"
                    .checked=${this._selectedListIds.has(list.id)}
                    @change=${() => this._toggleList(list.id)}
                  />
                  <span>${list.name}${list.builtin ? " ⭐" : ""}</span>
                </label>
              `,
            )}
          </div>

          ${this._waiting
            ? html`<mwc-linear-progress indeterminate></mwc-linear-progress>`
            : nothing}
        </div>

        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          .disabled=${this._waiting}
        >
          ${this._dialogParams.hacs.localize("common.cancel")}
        </mwc-button>

        <mwc-button
          slot="primaryAction"
          @click=${this._save}
          .disabled=${this._waiting}
        >
          ${this._dialogParams.hacs.localize("common.save")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  static get styles() {
    return css`
      .content {
        min-width: 320px;
        max-width: 560px;
      }

      .actions {
        margin-bottom: 16px;
      }

      .list {
        max-height: 50vh;
        overflow: auto;
      }

      .list-row {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 48px;
        padding: 4px 0;
        cursor: pointer;
      }

      .list-row input {
        width: 20px;
        height: 20px;
      }

      mwc-linear-progress {
        margin-bottom: -8px;
        margin-top: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hacs-repository-lists-dialog": HacsRepositoryListsDialog;
  }
}
