import { Sheet } from './base'

export class TeamDataSheet extends Sheet {
  constructor(data: any[][]) {
    super(data)
  }

  /**
   * Obtain a dictionary that maps nicknames to full names.
   */
  getNicknames(): Record<string, string> {
    const nicknames = {} as Record<string, string>
    this.toRecord().forEach((v) => (nicknames[v['nickname']] = v['fullName']))
    return nicknames
  }
}
