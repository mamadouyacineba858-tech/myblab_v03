import { HistoryCommand } from '../history/HistoryCommand.js'

export class MoveBreadboardCommand extends HistoryCommand {
  constructor(documentApi, fromPosition, toPosition) {
    super('MOVE_BREADBOARD')
    this.documentApi = documentApi
    this.fromPosition = { ...fromPosition }
    this.toPosition = { ...toPosition }
  }

  execute() {
    const document = this.documentApi.getDocument()
    if (!document.breadboard) return
    this.documentApi.applyDocument({
      ...document,
      breadboard: { ...document.breadboard, position: { ...this.toPosition } },
    })
  }

  undo() {
    const document = this.documentApi.getDocument()
    if (!document.breadboard) return
    this.documentApi.applyDocument({
      ...document,
      breadboard: { ...document.breadboard, position: { ...this.fromPosition } },
    })
  }
}
