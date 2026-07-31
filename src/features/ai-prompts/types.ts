/** One editable AI text (system prompt, context template, or canned message).
 *  Stored in the DB; changes take effect immediately (no deploy). */
export interface AiPromptOut {
  key: string;
  /** What the prompt is for (human explanation). */
  purpose: string;
  /** Where in the backend it's used (module::function). */
  used_in: string;
  /** Space-separated `{token}` placeholders the code will .format() in; may be "". */
  placeholders: string;
  default_value: string;
  current_value: string;
  is_overridden: boolean;
}
