export enum ActionPriority {
  /**
   * Critical priority for actions that must be executed first
   * Example: read_file when mixed with other actions
   */
  CRITICAL = 1,

  /**
   * High priority for actions that should be executed early
   * Example: search operations, path lookups
   */
  HIGH = 2,

  /**
   * Medium priority for standard file operations
   * Example: write_file, move_file, copy_file
   */
  MEDIUM = 3,

  /**
   * Low priority for actions that should be executed later
   * Example: fetch_url, execute_command
   */
  LOW = 4,

  /**
   * Lowest priority for actions that should be executed last
   * Example: end_task
   */
  LOWEST = 5,
}
