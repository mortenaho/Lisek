declare module 'sql.js' {
  export type SqlValue = string | number | Uint8Array | null
  export type BindParams = SqlValue[] | Record<string, SqlValue>
  export type ParamsObject = Record<string, SqlValue>

  export class Statement {
    bind(values?: BindParams): boolean
    step(): boolean
    get(): SqlValue[]
    getAsObject(): ParamsObject
    free(): void
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Buffer | null)
    run(sql: string, params?: BindParams): Database
    exec(sql: string): { columns: string[]; values: SqlValue[][] }[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string
  }): Promise<{ Database: typeof Database }>
}
