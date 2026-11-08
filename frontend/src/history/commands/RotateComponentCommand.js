import { HistoryCommand } from "../HistoryCommand.js"

/** Patches only orientation on the latest document for undo and redo. */
export class RotateComponentCommand extends HistoryCommand {
  constructor(documentApi, uid, before, after) {
    super(documentApi)
    this.uid = uid
    this.before = before
    this.after = after
  }

  setRotation(rotation) {
    const document = this.documentApi.getDocument()
    this.documentApi.applyDocument({
      ...document,
      components: document.components.map(component => {
        if (component.id !== this.uid) return component
        const next = { ...component }
        if (rotation === undefined) delete next.rotation
        else next.rotation = rotation
        return next
      }),
    })
  }

  apply() { this.setRotation(this.after) }
  undo() { this.setRotation(this.before) }
  getDescription() { return "Rotation du composant de 90°" }
}
